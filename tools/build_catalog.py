# Usage: python3 -I build_catalog.py <inventory.xlsx> <out catalog.js>
# Reads the inventory spreadsheet and the zone mapping, writes the catalog used by the app.
import sys, json, os, openpyxl
here = os.path.dirname(os.path.abspath(__file__))
xlsx, out = sys.argv[1], sys.argv[2]
rich = json.load(open(os.path.join(here, 'rich.json')))
mp = {}
for line in open(os.path.join(here, 'mapping.txt'), encoding='utf-8'):
    line = line.rstrip('\n')
    if line:
        sku, zone, where, does = line.split('|')
        mp[sku] = (zone, where, does)
RICH_SKU = {
 'moto': {'MC-0016':'plug','MC-0079':'fork','MC-0085':'handlebar','MC-0030':'tank','MC-0106':'seat','MC-0112':'exhaust','MC-0069':'headlight',
          'MC-0089':'frontwheel','MC-0090':'rearwheel','MC-0053':'brake','MC-0082':'shock','MC-0037':'chain','MC-0108':'mirrors','MC-0060':'battery'},
 'bike': {'BC-0002':'frame','BC-0004':'fork','BC-0054':'handlebar','BC-0009':'saddle','BC-0035':'frontwheel','BC-0036':'rearwheel','BC-0013':'crank',
          'BC-0022':'pedals','BC-0011':'chain','BC-0032':'brakes','BC-0018':'derailleur','BC-0064':'light'}}
PICK = {'moto': dict(zip(RICH_SKU['moto'].values(), RICH_SKU['moto'].keys())), 'bike': dict(zip(RICH_SKU['bike'].values(), RICH_SKU['bike'].keys()))}
PICK['moto'].update({'frame':'MC-0083','engine':'MC-0001','brake':'MC-0052'})
ANCHORS = {
 'bike': {'headtube':[[0.44,0.72,0],[60,12],0.8,'Head tube'],'seatclamp':[[-0.145,0.775,0],[40,20],0.7,'Seat clamp'],'bb':[[0,0.27,0],[30,10],0.8,'Bottom bracket'],
  'fd':[[0,0.37,0.05],[30,15],0.7,'Front derailleur'],'shifter':[[0.485,0.87,0.12],[-60,30],0.7,'Shifter'],'bell':[[0.47,0.9,-0.08],[-60,30],0.7,'Bell'],
  'computer':[[0.485,0.89,0],[-70,35],0.7,'Bike computer'],'rshock':[[-0.12,0.55,0],[25,10],1.1,'Rear shock'],'rearlight':[[-0.2,0.8,0],[-80,15],0.8,'Rear light'],
  'kickstand':[[-0.22,0.27,0],[40,15],0.9,'Kickstand'],'mudguard':[[0.52,0.7,0],[70,10],1.1,'Mudguard'],'cage':[[0.23,0.47,0],[30,10],0.9,'Bottle cage'],
  'rack':[[-0.5,0.74,0],[-60,20],1.1,'Rear rack']},
 'moto': {'carb':[[0.0,0.58,-0.06],[160,15],1.0,'Carburetor'],'airbox':[[-0.18,0.6,0.1],[-30,18],1.1,'Air filter box'],'petcock':[[0.12,0.76,0.1],[40,15],0.9,'Fuel tap'],
  'speedo':[[0.38,1.03,0],[-75,30],0.9,'Meter'],'ign':[[0.4,0.93,0],[-60,30],0.9,'Ignition switch'],'turn':[[0.52,0.93,0.18],[60,15],1.0,'Turn signal'],
  'horn':[[0.5,0.66,0.02],[75,10],1.0,'Horn'],'taillight':[[-0.9,0.8,0],[-100,12],1.0,'Tail light'],'underseat':[[-0.28,0.66,0.05],[-40,20],1.2,'Under the seat'],
  'coil':[[0.1,0.68,-0.05],[150,15],0.9,'Ignition coil'],'shift':[[0,0.25,-0.16],[170,10],1.0,'Gear shift lever'],'pedal':[[-0.12,0.2,0.17],[25,10],1.0,'Brake pedal'],
  'footpeg':[[0,0.25,0.17],[25,10],1.0,'Footpeg'],'steerhead':[[0.44,0.86,0],[60,20],0.9,'Steering head'],'ffender':[[0.6,0.5,0],[70,10],1.1,'Front fender'],
  'rfender':[[-0.76,0.62,0],[-70,15],1.2,'Rear fender'],'sidepanel':[[-0.25,0.58,0.1],[25,10],1.3,'Side cover'],'carrier':[[-0.78,0.87,0],[-70,25],1.2,'Rear carrier'],
  'plate':[[-0.93,0.62,0],[-100,10],1.1,'License plate']}}
wb = openpyxl.load_workbook(xlsx, data_only=True)
cat = {}
for key, sheet in (('moto', 'Motorcycle Parts'), ('bike', 'Bicycle Parts')):
    items = []
    for r in wb[sheet].iter_rows(min_row=2, values_only=True):
        if not r[0]: continue
        sku = r[0]
        if sku not in mp: raise SystemExit('No mapping for ' + sku)
        zone, where, does = mp[sku]
        it = dict(sku=sku, name=r[4], cat=r[2], sub=r[3], low=r[5], high=r[6], list=r[7], stock=r[8] or 0, brand=r[9] or '', zone=zone, where=where, does=does)
        z = RICH_SKU[key].get(sku)
        if z:
            rr = rich[key][z]
            it.update(where=rr['where'], does=rr['does'], steps=rr['steps'], tools=rr['tools'], signs=rr['signs'])
        items.append(it)
    cat[key] = items
views = {k: {z: v['view'] for z, v in rich[k].items()} for k in rich}
js = 'const CATALOG=%s;\nconst ANCHORS=%s;\nconst ZONE_VIEW=%s;\nconst PICK=%s;\n' % tuple(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in (cat, ANCHORS, views, PICK))
open(out, 'w', encoding='utf-8').write(js)
print({k: len(v) for k, v in cat.items()}, len(js), 'bytes')
