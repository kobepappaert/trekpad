# Vandra

Web app (installable on your phone) for multi-day hikes in Europe, with or without a car.

## What it does
- Four ways of travelling (train/bus, own car, flying, flying + rental car); only routes that are realistic from the user's own start point are shown
- Per route: beauty and difficulty score, "starting safely" tips, places to sleep, costs, days away from home, live weather and clothing advice
- Map with the OpenStreetMap track and huts/campsites/hostels along it, GPX download with waypoints
- Interface in Dutch, English, French and German

## Files
- `index.html` – app shell
- `css/style.css` – styling
- `js/app.js` – logic (feasibility, costs, weather, map, photos, GPX)
- `js/routes.js` – all route data (add routes here)
- `js/i18n.js` – interface texts per language
- `sw.js`, `manifest.webmanifest`, `icons/` – installable, works offline

## Adding a route
Copy a block in `js/routes.js` and adjust. `wiki` is the English Wikipedia title (photo fallback), `photoQuery` the Wikimedia Commons search,
`osm` the name (regex) of the hiking relation in OpenStreetMap, or `stages` a list of [lat, lon] stage points when no relation exists.

## Data sources
Photos: Wikimedia Commons (credited per photo) · Map, tracks and places to sleep: © OpenStreetMap contributors (ODbL) · Weather: Open-Meteo · Geocoding: Nominatim
