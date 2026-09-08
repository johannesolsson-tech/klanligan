# Lanista Klanliga-bot

Bot + Edge/Chrome-bookmarklet för Järnpakten (klan-ID 5).

## Vad den gör

När du klickar bokmärket på lanista.se:

1. Hämtar `/api/clans/5/battles`.
2. Filtrerar bort allt utom `division.name === "Klanligan"`.
3. Tar endast framtida, ospelade matcher.
4. Sorterar på `plays_at` och tar **bara den närmaste matchen**.
5. Hämtar `/api/clans/5/battles/{id}/settings`.
6. Sorterar spelarna efter `order` och tar exakt `players_per_team` stycken.
   - 3 vs 3 = första 3
   - 4 vs 4 = första 4
   - 5 vs 5 = första 5
7. Läser varje spelares `role_type` och skickar uppställningen till Discord.
8. Matchar Lanista-namn mot Discord-ID och pingar de valda spelarna.

Miniligan och andra ligor ignoreras helt. När den närmaste Klanligamatchen är spelad kommer nästa klick automatiskt välja nästa Klanligamatch.

## 1. Discord Developer Portal

Skapa en ny bot/applikation eller använd en separat bot för Klanligan.

Bot-behörigheter i kanalen:
- View Channel
- Send Messages
- Embed Links
- Read Message History
- Manage Messages (bara om `DELETE_PREVIOUS=true`)

Privileged Message Content Intent behövs inte.

Kopiera bot-token och lägg den endast i Railway som `DISCORD_TOKEN`. Lägg aldrig tokenen i GitHub eller bookmarklet.

## 2. GitHub

Skapa ett nytt repository och ladda upp:

- `index.js`
- `package.json`
- `railway.json`
- `.gitignore`
- `.env.example`
- `bookmarklet-generator.html`
- `README.md`

`.env` ska inte laddas upp.

## 3. Railway

Skapa New Project / Deploy from GitHub Repo och välj repot.

Lägg in Variables:

```text
DISCORD_TOKEN=...
KLANLIGA_CHANNEL_ID=...
UPDATE_SECRET=...
DELETE_PREVIOUS=true
```

`UPDATE_SECRET` ska vara en lång egen slumpmässig sträng och måste vara exakt samma i Railway och bokmärkesgeneratorn.

Under Settings -> Networking -> Public Networking: generera en publik domän för tjänstens port. Appen använder `PORT` från Railway och fallback 8080.

Kontrollera sedan:

```text
https://DIN-RAILWAY-URL/health
```

Den ska svara med `ok: true` och efter Discord-inloggning `discordReady: true`.

## 4. Discord-ID för spelarna

Aktivera Developer Mode i Discord, högerklicka användaren -> Copy User ID.

I `bookmarklet-generator.html` skriver du exempelvis:

```text
Jool=123456789012345678
Godlin=234567890123456789
smares=345678901234567890
```

Suffixet `Järnsvuren` tas automatiskt bort vid matchning, så `Jool Järnsvuren` matchas mot `Jool`.

Flerordsnamn fungerar också. Använd spelarens Lanista-namn utan det avslutande suffixet `Järnsvuren`.

## 5. Skapa bokmärket

1. Öppna `bookmarklet-generator.html` lokalt i Edge/Chrome.
2. Fyll i Railway URL.
3. Fyll i samma `UPDATE_SECRET` som i Railway.
4. Lägg in Discord-ID:n.
5. Klicka `Skapa bokmärkeskod`.
6. Skapa ett nytt bokmärke/favorit.
7. Klistra in hela `javascript:...`-koden som bokmärkets URL.

## 6. Användning

1. Logga in på `https://lanista.se`.
2. Klicka bokmärket.
3. Scriptet hittar närmaste Klanligamatch och skickar endast den till Discord.

Exempel:
- 2026-09-08 19:30 Gryningsbröderna, 3 vs 3 -> väljs.
- Miniligan mellan matcherna ignoreras.
- Efter att Gryningsbröderna-matchen spelats -> nästa klick väljer Jotunheim 2026-09-10 19:30, 5 vs 5.

## Roller

Botten visar:
- `NONE` -> Ingen roll
- `TAUNT` -> Provokatör
- `DPS` -> Skadegörare

Om Lanista inför fler `role_type` visas det råa rollnamnet tills mappningen uppdateras.

## Tid

Lanistas `plays_at` skickas som UTC. Discord-tidsstämplar används, så varje användare ser korrekt lokal tid, t.ex. 19:30 i Sverige när det är rätt för den aktuella matchen.

## Säkerhet

- `DISCORD_TOKEN` finns bara i Railway.
- Lanistas inloggningscookie lämnar aldrig webbläsaren.
- Bookmarklet hämtar Lanista-API:t med din vanliga inloggade session och skickar endast sammanställd match/uppställningsdata till Railway.
- Bokmärket innehåller `UPDATE_SECRET`, så dela det inte offentligt.
