const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const PORT = process.env.PORT || 8080;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.KLANLIGA_CHANNEL_ID;
const UPDATE_SECRET = process.env.UPDATE_SECRET;
const DELETE_PREVIOUS = String(process.env.DELETE_PREVIOUS ?? 'true').toLowerCase() === 'true';

if (!DISCORD_TOKEN || !CHANNEL_ID || !UPDATE_SECRET) {
  console.error('DISCORD_TOKEN, KLANLIGA_CHANNEL_ID och UPDATE_SECRET måste finnas som miljövariabler.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const app = express();

app.use(express.text({ type: ['text/plain', 'application/json'], limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const ROLE_NAMES = {
  NONE: 'Ingen roll',
  TAUNT: 'Provokatör',
  DPS: 'Skadegörare'
};

function roleName(roleType) {
  const key = String(roleType || 'NONE').toUpperCase();
  return ROLE_NAMES[key] || key;
}

function safeId(value) {
  const s = String(value || '').trim();
  return /^\d{10,25}$/.test(s) ? s : null;
}

function discordTimestamp(iso) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

async function deletePreviousMessages(channel) {
  if (!DELETE_PREVIOUS) return;
  try {
    const messages = await channel.messages.fetch({ limit: 25 });
    const mine = messages.filter(m => m.author?.id === client.user?.id && m.embeds?.some(e => e.footer?.text === 'Lanista Klanliga'));
    for (const [, message] of mine) {
      await message.delete().catch(() => {});
    }
  } catch (err) {
    console.warn('Kunde inte radera tidigare Klanliga-inlägg:', err.message);
  }
}

app.get('/', (_req, res) => {
  res.type('text').send('Lanista Klanliga-bot kör.');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, discordReady: client.isReady() });
});

app.post('/update', async (req, res) => {
  try {
    let data;
    try {
      data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).send('Ogiltig JSON.');
    }

    if (!data || data.secret !== UPDATE_SECRET) {
      return res.status(403).send('Fel UPDATE_SECRET.');
    }

    if (!client.isReady()) {
      return res.status(503).send('Discord-boten är inte redo ännu.');
    }

    const battle = data.battle;
    const players = Array.isArray(data.players) ? data.players : [];
    if (!battle?.id || !battle?.playsAt || !battle?.opponent || !battle?.playersPerTeam) {
      return res.status(400).send('Matchdata saknas.');
    }
    if (players.length !== Number(battle.playersPerTeam)) {
      return res.status(400).send(`Fel antal spelare. Förväntade ${battle.playersPerTeam}, fick ${players.length}.`);
    }

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel?.isTextBased()) {
      return res.status(500).send('KLANLIGA_CHANNEL_ID pekar inte på en textkanal.');
    }

    await deletePreviousMessages(channel);

    const mentionIds = [];
    const lineup = players.map((p, index) => {
      const id = safeId(p.discordId);
      if (id) mentionIds.push(id);
      const who = id ? `<@${id}>` : `**${p.displayName || p.name || 'Okänd'}**`;
      return `${index + 1}. ${who} — ${roleName(p.roleType)}`;
    }).join('\n');

    const ts = discordTimestamp(battle.playsAt);
    const when = ts ? `<t:${ts}:F>\n<t:${ts}:R>` : String(battle.playsAt);
    const side = battle.isHome ? 'Hemma' : 'Borta';

    const embed = new EmbedBuilder()
      .setTitle('⚔️ Nästa Klanligastrid')
      .setDescription(`**Järnpakten vs ${battle.opponent}**`)
      .addFields(
        { name: 'Tid', value: when, inline: true },
        { name: 'Format', value: `${battle.playersPerTeam} vs ${battle.playersPerTeam}`, inline: true },
        { name: 'Sida', value: side, inline: true },
        { name: 'Laguppställning', value: lineup || 'Ingen uppställning hittades.' }
      )
      .setFooter({ text: 'Lanista Klanliga' })
      .setTimestamp(new Date());

    const content = mentionIds.length ? mentionIds.map(id => `<@${id}>`).join(' ') : '';

    const message = await channel.send({
      content,
      embeds: [embed],
      allowedMentions: { users: [...new Set(mentionIds)] }
    });

    res.json({ ok: true, messageId: message.id, battleId: battle.id, players: players.length });
  } catch (err) {
    console.error(err);
    res.status(500).send(err?.message || 'Okänt fel.');
  }
});

client.once('ready', () => {
  console.log(`Discord inloggad som ${client.user.tag}`);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webbserver lyssnar på port ${PORT}`);
});

client.login(DISCORD_TOKEN).catch(err => {
  console.error('Discord-inloggning misslyckades:', err);
  process.exit(1);
});
