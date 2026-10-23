# Smartphone Berater · Saturn Dresden (v6)

Smartphone-Berater für den Markt in der Altmarkt-Galerie Dresden, optisch an Elektronikmärkte angelehnt (rot/weiß). Enthalten sind ein Katalog mit **50 aktuellen Smartphones (2025/2026) von 12 Marken**, echte Produktbilder, Filter und Sortierung, ein Vergleich von bis zu 3 Geräten, Detailseiten mit Galerie und Farbwahl, ein Berater-Quiz, eine Merkliste, ein KI-Chat und ein KI-Preis-Check.

> Die Preise sind **UVP zum Marktstart** (Herstellerangaben bzw. Presse). Die Live-Preise sind KI-Schätzungen ohne Gewähr; bei jedem Gerät gibt es Links zur Händlersuche. Unsichere Datenfelder sind im Datensatz (`uncertain`) und in der Detailansicht markiert.

## Starten

Voraussetzung: Node.js 18 oder neuer.

```bash
npm install
cp .env.example .env      # optional: GEMINI_API_KEY eintragen
npm start                 # http://localhost:3000
```

* `GEMINI_API_KEY` wird **nur** aus der Umgebung bzw. `.env` gelesen und nie ausgeliefert. `.env` steht in `.gitignore`.
* Ohne Schlüssel läuft die App vollständig, also Katalog, Quiz, Vergleich und Merkliste. Chat und Preis-Check melden dann freundlich, dass die KI nicht verfügbar ist (`GET /api/status`).
* Optional lassen sich `PORT` und `GEMINI_MODEL` setzen (Standard: `gemini-2.5-flash`).

## Struktur

```
server.js                 Express: statische Auslieferung, /api/chat, /api/price, /api/status
                          (Gemini-Proxy, Eingabeprüfung, Rate-Limit; Sortiment kommt aus phones.json)
public/index.html         App-Shell (Hash-Routing)
public/css/app.css        Design-Tokens, Mobile-First, Tablet- und Desktop-Layouts
public/js/main.js         Router und Bootstrapping
public/js/data.js         Laden, Normalisieren und Formatieren der Gerätedaten
public/js/specs.js        Spec-Tabellen, Hinweise auf unsichere Felder
public/js/store.js        Merkliste und Vergleich (localStorage)
public/js/views/*.js      Start, Katalog, Detail, Vergleich, Quiz, Chat, Infoseiten
public/img/phones/        Produktbilder (WebP, ca. 600 px, lokal, kein Hotlinking)
public/img/ui/            Hero-, Kachel- und Kategoriegrafiken (in Canva erstellt)
public/data/phones.json   Generierter Katalog (nicht von Hand bearbeiten)
data/parts/*.json         Recherchierte Gerätedaten pro Marke (Quelle der Wahrheit)
data/parts/*.sources.md   Bildquellen pro Marke
data/image_sources.md     Generierte Gesamtliste aller Bildquellen und Rechteinhaber
scripts/build-data.mjs    Prüft und vereinigt data/parts zu phones.json und image_sources.md
```

## Geräte pflegen

1. In `data/parts/<marke>.json` einen Eintrag ergänzen oder ändern. Wichtige Felder sind `id`, `brand`, `name`, `release`, `uvp_eur`, `uvp_by_storage`, `display`, `camera`, `battery_mah`, `images`, `image_colors`, `uncertain` und `sources`.
2. Das Bild als WebP (ca. 600 px, freigestellt) unter `public/img/phones/<id>-<n>.webp` ablegen und die Quelle in `data/parts/<marke>.sources.md` eintragen.
3. `npm run build:data` ausführen. Das Skript prüft Pflichtfelder, IDs und Bilder. Fehlt ein Bild, zeigt die App einen Platzhalter.

## Bilder und Rechte

Die Produktbilder stammen überwiegend aus offiziellen Hersteller-Pressebereichen und Produktseiten (u. a. Samsung Mobile Press, Google Store, Motorola, Nothing, OnePlus, Honor, Oppo, Xiaomi, Sony, Fairphone, HMD). Die iPhone-Bilder und einige Galaxy-S26-Bilder sind Fotos von Wikimedia Commons (CC BY-SA, CC BY oder CC0, mit Urheberangabe). Die vollständige Liste mit Seiten-URL, Bild-URL und Rechteinhaber steht in `data/image_sources.md`. Logos oder Inhalte von MediaMarkt/Saturn werden nicht verwendet.

Die Grafiken in `public/img/ui/` (Hero, Aktionskacheln, Kategorien) wurden in Canva gestaltet und als WebP exportiert.

## Versionen

* **v6:** komplettes Redesign (rot/weiß, Karten, Galerie, Farbwahl), 50 Geräte mit echten Bildern, datengetriebene Pipeline, Canva-Grafiken, Vergleich bis 3 Geräte, neues Quiz.
* **v5:** ChatGPT- und Gemini-Version zusammengeführt, Merkliste, Vergleich, lokale Hilfe.
* **v4:** Backend-Proxy, saubere Struktur, datengetriebenes Quiz.
