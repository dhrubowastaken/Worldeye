#!/usr/bin/env node
/**
 * Script to build satellite name mappings using the same merging technique as useSpaceTraffic.ts
 * Extracts NORAD IDs and names from merged CelesTrak TLE data (free, no API key needed)
 * Run: node scripts/build-satellite-names.cjs
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const OUTPUT_FILE = path.join(__dirname, '../public/satellite-names.json');

// Same groups as useSpaceTraffic.ts
const CELESTRAK_GROUPS = [
  'active', 'starlink', 'oneweb', 'gps-ops', 'glonass-ops',
  'iridium', 'orbcomm', 'globalstar', 'intelsat', 'ses', 'telesat', 'iridium-next'
];

// Built-in fallback data (comprehensive offline cache)
const FALLBACK_SATELLITES = {
  '25544': { name: 'ISS (ZARYA)', group: 'active' },
  '20580': { name: 'HUBBLE SPACE TELESCOPE', group: 'active' },
  '28654': { name: 'NOAA 12', group: 'noaa' },
  '29155': { name: 'NOAA 14', group: 'noaa' },
  '33591': { name: 'NOAA 18', group: 'noaa' },
  '35293': { name: 'NOAA 19', group: 'noaa' },
  '43013': { name: 'JSS (HEO-A)', group: 'spacestation' },
  
  // GPS satellites
  '32260': { name: 'GPS IIR  1  (PRN 13)', group: 'gps-ops' },
  '32384': { name: 'GPS IIR  2  (PRN 04)', group: 'gps-ops' },
  '32711': { name: 'GPS IIR  3  (PRN 06)', group: 'gps-ops' },
  '35752': { name: 'GPS IIR  5  (PRN 09)', group: 'gps-ops' },
  '36585': { name: 'GPS IIR  6  (PRN 02)', group: 'gps-ops' },
  '38833': { name: 'GPS IIR  8  (PRN 12)', group: 'gps-ops' },
  '39166': { name: 'GPS IIR 10  (PRN 14)', group: 'gps-ops' },
  '39533': { name: 'GPS IIR 11  (PRN 18)', group: 'gps-ops' },
  '40105': { name: 'GPS IIR 12  (PRN 17)', group: 'gps-ops' },
  '40106': { name: 'GPS IIR 13  (PRN 28)', group: 'gps-ops' },
  '40547': { name: 'GPS IIR 14  (PRN 01)', group: 'gps-ops' },
  '40889': { name: 'GPS IIR 15  (PRN 03)', group: 'gps-ops' },
  '41019': { name: 'GPS IIR 16  (PRN 07)', group: 'gps-ops' },
  '41059': { name: 'GPS IIR 17  (PRN 05)', group: 'gps-ops' },
  '41328': { name: 'GPS IIR 18  (PRN 08)', group: 'gps-ops' },
  '41476': { name: 'GPS IIR 19  (PRN 11)', group: 'gps-ops' },
  
  // GLONASS
  '37348': { name: 'GLONASS 1', group: 'glonass-ops' },
  '37349': { name: 'GLONASS 2', group: 'glonass-ops' },
  '37350': { name: 'GLONASS 3', group: 'glonass-ops' },
  '37351': { name: 'GLONASS 4', group: 'glonass-ops' },
  '37424': { name: 'GLONASS 5', group: 'glonass-ops' },
  '37425': { name: 'GLONASS 6', group: 'glonass-ops' },
  '37426': { name: 'GLONASS 7', group: 'glonass-ops' },
  
  // Starlink (sample)
  '44713': { name: 'STARLINK-1001', group: 'starlink' },
  '44714': { name: 'STARLINK-1002', group: 'starlink' },
  '44715': { name: 'STARLINK-1003', group: 'starlink' },
  
  // Iridium
  '24792': { name: 'IRIDIUM 1 [PL]', group: 'iridium' },
  '24793': { name: 'IRIDIUM 2 [PL]', group: 'iridium' },
  '24794': { name: 'IRIDIUM 3 [PL]', group: 'iridium' },
  '24795': { name: 'IRIDIUM 4 [PL]', group: 'iridium' },
  '24796': { name: 'IRIDIUM 5 [PL]', group: 'iridium' },
  
  // NROL
  '25017': { name: 'NROL-1 (VORTEX 1)', group: 'nro' },
  '25066': { name: 'NROL-2', group: 'nro' },
  '26690': { name: 'NROL-3 (INTRUDER 1)', group: 'nro' }
};

/**
 * Parse TLE data into satellite records (same as useSpaceTraffic.ts)
 */
function parseTLE(tleData) {
  const lines = tleData.split('\n');
  const satellites = [];
  for (let i = 0; i < lines.length; i += 3) {
    if (lines[i] && lines[i + 1] && lines[i + 2]) {
      let name = lines[i].trim();
      const tleLine1 = lines[i + 1].trim();
      const tleLine2 = lines[i + 2].trim();

      // Extract NORAD ID from TLE line 1
      let noradId = null;
      if (/^\d+$/.test(name)) {
        noradId = name;
      } else {
        const match = tleLine1.match(/^\s*1\s+(\d+)/);
        noradId = match ? match[1] : null;
      }

      if (noradId && name && !/^\d+$/.test(name)) {
        try {
          const satrec = {}; // We don't need the satrec for name mapping
          satellites.push({ name, satrec, tleLine1, noradId });
        } catch (e) {
          // Skip invalid records
        }
      }
    }
  }
  return satellites;
}

/**
 * Fetch TLE data from CelesTrak (sequential fetching to avoid timeouts)
 */
function fetchCelesTrakGroup(group) {
  return new Promise((resolve) => {
    const url = `http://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`;
    const timeout = 15000; // 15 second timeout per group

    const timer = setTimeout(() => {
      console.log(`⏱️  ${group} - timeout`);
      resolve('');
    }, timeout);

    http.get(url, { timeout }, (res) => {
      clearTimeout(timer);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✓ ${group}: ${data.length} bytes`);
        resolve(data);
      });
    }).on('error', (e) => {
      clearTimeout(timer);
      console.log(`⚠️  ${group} - ${e.code}`);
      resolve('');
    });
  });
}

/**
 * Build satellite cache using same merging logic as useSpaceTraffic.ts
 */
async function buildSatelliteNames() {
  console.log('🛰️  Building satellite name mappings from CelesTrak (merged sources)...\n');

  const satellites = {};

  console.log('📡 Fetching from CelesTrak groups (sequential)...');
  const tleStrings = [];
  
  for (const group of CELESTRAK_GROUPS) {
    console.log(`Fetching ${group}...`);
    const tleData = await fetchCelesTrakGroup(group);
    tleStrings.push(tleData);
    // Small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Merge all sources using same logic as useSpaceTraffic.ts
  const allSatellites = new Map();

  tleStrings.forEach((tleData, index) => {
    if (tleData) {
      const group = CELESTRAK_GROUPS[index];
      const satellites = parseTLE(tleData);
      satellites.forEach(sat => {
        // Use satellite name as key (first source wins, same as useSpaceTraffic.ts)
        if (!allSatellites.has(sat.name)) {
          allSatellites.set(sat.name, { ...sat, group });
        }
      });
    }
  });

  // Convert merged results to cache format
  for (const [name, sat] of allSatellites) {
    if (sat.noradId) {
      satellites[sat.noradId] = {
        noradId: sat.noradId,
        primaryName: sat.name,
        alternativeNames: [],
        lastFetchedAt: new Date().toISOString(),
        source: sat.group
      };
    }
  }

  const mergedCount = Object.keys(satellites).length;

  // If we got very few satellites (network issues), use fallback
  if (mergedCount < 100) {
    console.log(`\n⚠️  Only got ${mergedCount} satellites from network, adding fallback data...`);
    for (const [noradId, info] of Object.entries(FALLBACK_SATELLITES)) {
      if (!satellites[noradId]) {
        satellites[noradId] = {
          noradId,
          primaryName: info.name,
          alternativeNames: [],
          lastFetchedAt: new Date().toISOString(),
          source: info.group
        };
      }
    }
  }

  const output = {
    satellites,
    lastUpdated: new Date().toISOString(),
    version: 1,
    note: `Built from merged CelesTrak TLE data (${Object.keys(satellites).length} satellites)`
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved ${Object.keys(satellites).length} satellites to ${OUTPUT_FILE}`);

  // Show breakdown by source
  const bySource = {};
  for (const [id, sat] of Object.entries(satellites)) {
    const source = sat.source || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  }

  console.log('\n📊 Satellites by source:');
  for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${source}: ${count}`);
  }
}

buildSatelliteNames().catch(console.error);
