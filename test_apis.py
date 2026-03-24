import urllib.request
import json

def test_cel():
    req = urllib.request.Request('https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            print("Celestrak length:", len(response.read().decode('utf-8')))
    except Exception as e:
        print("Celestrak Error:", e)

def test_adsb():
    req = urllib.request.Request('https://api.adsb.lol/v2/lat/20.000/lon/0.000/dist/250', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print("ADSB count:", len(data.get('ac', [])))
    except Exception as e:
        print("ADSB Error:", e)

test_cel()
test_adsb()
