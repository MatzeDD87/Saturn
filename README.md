# MMS Smartphone-Berater PRO · Dresden Altmarkt-Galerie

Mobile Web-App für die Smartphone-Beratung am Regal: Beratungs-Flow mit Match-Score,
Markt-Bestand mit Gang-Platzierung, Direktvergleich, Live-Preischeck und KI-Chat (Gemini).

## Start

```bash
npm install
cp .env.example .env   # GEMINI_API_KEY eintragen
npm start              # http://localhost:3000
```

Der Gemini-Key bleibt auf dem Server (`/api/chat`, `/api/price`). Ohne Server lässt sich
`public/index.html` auch direkt öffnen – dann kann unter ⚙️ ein eigener Key hinterlegt werden.

## Pflege

- Geräte, Preise, Gänge, Zubehör: Array `DEVICES` in `public/index.html`
- Markt-Name / Service-Preis: Objekt `STORE`
- Bestand kann im Lager-Tab pro Gerät korrigiert werden (wird lokal im Browser gespeichert)
