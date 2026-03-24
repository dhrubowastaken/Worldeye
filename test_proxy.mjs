const testAdsb = async () => {
    try {
        const res = await fetch('http://localhost:5173/api/adsb/lat/20.000/lon/0.000/dist/250');
        if (!res.ok) throw new Error('ADSB proxy failed: ' + res.status);
        const data = await res.json();
        console.log(`ADSB returned ${data?.ac?.length || 0} aircraft.`);
    } catch(e) {
        console.error("ADSB Test Error:", e.message);
    }
};

const testCelestrak = async () => {
    try {
        const res = await fetch('http://localhost:5173/api/celestrak/NORAD/elements/gp.php?GROUP=active&FORMAT=tle');
        if (!res.ok) throw new Error('Celestrak proxy failed: ' + res.status);
        const data = await res.text();
        console.log(`Celestrak returned data: ${data.substring(0, 100).replace(/\n/g, ' ')}...`);
    } catch(e) {
        console.error("Celestrak Test Error:", e.message);
    }
};

testAdsb();
testCelestrak();
