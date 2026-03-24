import urllib.request
import json

def test_adsb():
    # New York roughly Lat: 40.71, Lon: -74.00
    req = urllib.request.Request('https://api.adsb.lol/v2/lat/40.71/lon/-74.00/dist/250', headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            print("ADSB count near NY:", len(data.get('ac', [])))
    except Exception as e:
        print("ADSB Error:", e)

test_adsb()
