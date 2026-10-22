# Saturn AI-Pilot PRO · Dresden

Smartphone-Berater für Saturn (Altmarkt-Galerie Dresden): In 3 Schritten (Nutzung, Budget, iPhone/Android) bekommst du passende Handys aus dem Sortiment empfohlen. Dazu gibt es einen KI-Chat und einen Live-Preis-Check (Gemini mit Google-Suche).

> Live-Preise sind **KI-Schätzungen ohne Gewähr**, deshalb ist bei jedem Gerät ein Link zur saturn.de-Suche dabei.

## Lokal starten

Voraussetzung: Node.js 18 oder neuer.

```bash
npm install
cp .env.example .env      # dann GEMINI_API_KEY in .env eintragen
npm start                 # http://localhost:3000
```

Ohne Schlüssel funktionieren Quiz und Geräteliste trotzdem, nur Chat und Live-Preis zeigen eine Fehlermeldung.

## Struktur

```
server.js              Express-Server: liefert public/ aus, Proxy /api/chat und /api/price zu Gemini
                       (Schlüssel nur auf dem Server, Eingabeprüfung, Rate-Limit 20/Minute)
public/index.html      Grundgerüst
public/styles.css      Design (dunkles Saturn-Orange, mobil zuerst)
public/app.js          Quiz (datengetrieben), Ergebnisse, Live-Preis, Chat
public/data/phones.js  Produktdaten + Handy-Grafik (SVG)
.env.example           Vorlage für Umgebungsvariablen
```

## Geräte ändern

Einfach in `public/data/phones.js` einen Eintrag ergänzen/anpassen (`price`, `os`, `budget`, `use`, `features`). Die Sortimentsliste für den Chat steht in `server.js` (`SYSTEM`).

## Version 5 – Zusammenführung (ChatGPT- + Gemini-Version)
- UX, Beratung in 3 Schritten, Katalog mit Filtern, Merkliste (localStorage), Vergleich (bis 3 Geräte), Händlerlinks Saturn/MediaMarkt und lokale Hilfe aus der Version vom 14.10.2026.
- Backend (Express, Gemini-Proxy mit Rate-Limit & Validierung), KI-Chat und Live-Preis-Schätzung aus v4.
- `GET /api/status` meldet, ob ein Schlüssel gesetzt ist. Ohne `GEMINI_API_KEY` läuft die App vollständig mit lokaler Hilfe.
- Komplett neues Design: Design-Tokens, Mobile-First, SVG-Icons und Geräte-Illustrationen, neutrale Wortmarke „Smartphone Berater“.
