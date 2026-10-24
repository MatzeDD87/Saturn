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

- Geräte, Preise, Gänge, Zubehör: Array `DEVICES` in `public/logic.js`
- Markt-Name / Service-Preis: Objekt `STORE` in `public/logic.js`
- Bestand kann im Lager-Tab pro Gerät korrigiert werden (wird lokal im Browser gespeichert)

## Online-Preise scrapen

```bash
npm run scrape                       # alle Geräte von saturn.de
npm run scrape -- --shop=mediamarkt  # oder mediamarkt.de
npm run scrape -- --only=s25u,ip17   # nur bestimmte Geräte
```

Der Scraper öffnet die Shop-Suche in einem Chrome-Browser (Puppeteer), wählt das passende Gerät
(Zubehör und andere Varianten wie „Ultra“ oder „+“ werden aussortiert) und liest den Preis aus den
schema.org-Daten der Produktseite. Ergebnis: `data/prices.json`. Der „Live-Preis“-Button zeigt diesen
Preis sofort an, solange er höchstens 36 Stunden alt ist – sonst greift die Gemini-Suche.

- **Feste Produkt-URLs** in `data/product-urls.json` haben Vorrang vor der Suche (zuverlässiger).
- Er arbeitet bewusst langsam (ca. 3–4,5 s Pause pro Seite) und beachtet die `robots.txt`.
- Schlägt ein Gerät fehl (z. B. Bot-Schutz), bleibt der letzte gültige Preis erhalten.
- Täglich automatisch, z. B. per Cron: `0 6 * * * cd /pfad/zum/projekt && npm run scrape`
- Eigenes Chrome nutzen: `CHROME_PATH=/usr/bin/chromium npm run scrape`

## Tests

```bash
npm test
```

Prüft Gerätedaten, Empfehlungslogik (inkl. aller Antwortkombinationen), Preis-Parser,
HTML-Escaping, die Server-API und den Scraper (gegen einen lokalen Shop-Nachbau, braucht Chrome) (Gemini wird dabei simuliert, es entstehen keine Kosten).
Nach Änderungen an `DEVICES` zeigen die Tests sofort, ob sich Empfehlungen verschoben haben.
