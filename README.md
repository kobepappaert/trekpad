# Trekpad 🎒

Web-app (installeerbaar op je gsm) voor meerdaagse trektochten in Europa, met of zonder auto.
Live: https://kobepappaert.github.io/trekpad/

## Wat zit erin
- 4 reisvormen: zonder auto, eigen auto, vliegen, vliegen + huurauto → per route "goed haalbaar / omslachtig / niet realistisch"
- Per route: schoonheid (sterren), moeilijkheidsgraad (1–5), "veilig starten", slaapplekken, kosten, weer en kledingadvies
- Foto's van Wikimedia Commons (automatische bronvermelding), kaart van OpenStreetMap, weer van Open-Meteo

## Bestanden
- `index.html` – de schil van de app
- `css/style.css` – vormgeving
- `js/app.js` – logica (kosten, weer, kaart, foto's)
- `js/routes.js` – **alle routegegevens** (hier voeg je routes toe)
- `sw.js`, `manifest.webmanifest`, `icons/` – maakt de app installeerbaar en offline bruikbaar

## Een route toevoegen
Open `js/routes.js`, kopieer een bestaand blok en pas aan. Het veld `wiki` is de titel van het Engelse
Wikipedia-artikel; daaruit haalt de app automatisch de foto en de bronvermelding.
