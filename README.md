# MOTOMAP

A bike and motorbike parts store with 3D models. Pick a model, click a part, and the model turns and zooms to where it goes.

## Run it in VS Code
1. Open this folder in VS Code (File > Open Folder).
2. Install the "Live Server" extension, right-click `index.html`, choose "Open with Live Server".
   Or in a terminal in this folder: `python3 -m http.server 8000`, then open http://localhost:8000
   (Double-clicking `index.html` also works.)

Fonts load from Google Fonts and need internet. Everything else works offline.

## Files
- `index.html`: the page
- `css/style.css`: look and layout (light and dark themes)
- `js/app.js`: store, cart, model picker, camera and 3D controls
- `js/models.js`: all 3D models and the brand list (see below)
- `js/catalog.js`: GENERATED parts catalog. Do not edit by hand.
- `vendor/three.min.js`: Three.js r128
- `data/motorcycle_bicycle_parts_inventory.xlsx`: your inventory sheet
- `tools/`: rebuilds the catalog from the sheet

## Models and brands
269 models: 116 bicycles (32 brands) and 153 motorbikes (24 brands).
Body styles: bicycles are city, road, mountain, BMX, hybrid, gravel, fat, folding, beach cruiser, e-bike.
Motorbikes are standard, sport, cruiser, scooter, maxi scooter, underbone, adventure, dual-sport, retro, touring, mini.
Shapes are simplified by body style. They are not exact replicas of each brand's bike.

To add a model, open `js/models.js` and add one line to `MOTO_LIST`, `BIKE_LIST`, `MORE_MOTO` or `MORE_BIKE`:
`['Name','style',0xCOLOR,'short description']` inside the brand's list. To add a brand, add a new `['Brand',[ ... ]]` entry.

## Update prices and stock
Edit the spreadsheet (Suggested Listing Price, Stock Qty, Brand), then run:

    python3 -m pip install openpyxl
    python3 -I tools/build_catalog.py data/motorcycle_bicycle_parts_inventory.xlsx js/catalog.js

A listing price replaces the estimated range. Stock above 0 shows "In stock".
To add a part, add a row with a new SKU and a line in `tools/mapping.txt`: `SKU|zone|where it goes|what it does`.

## Using real GLB models later
Put `.glb` files in a `models/` folder, then ask Claude to wire them in.
