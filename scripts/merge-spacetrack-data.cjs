#!/usr/bin/env node
/**
 * Script to merge Space-Track satellite catalog with our existing cache
 * Space-Track provides 68,000+ satellites with comprehensive NORAD data
 * Run: node scripts/merge-spacetrack-data.cjs
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../public/data/satellite-names.json');
const SPACETRACK_FILE = path.join(__dirname, '../spacetrack_full_satcat.json');

function mergeSpaceTrackData() {
  console.log('🛰️  Merging Space-Track satellite catalog...\n');

  // Load existing cache
  let cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`📡 Loaded existing cache with ${Object.keys(cache.satellites).length} satellites`);
  } catch (e) {
    console.error('❌ Failed to load existing cache:', e.message);
    return;
  }

  // Load Space-Track data
  let spacetrackData;
  try {
    spacetrackData = JSON.parse(fs.readFileSync(SPACETRACK_FILE, 'utf8'));
    console.log(`📡 Loaded Space-Track data with ${spacetrackData.length} satellites`);
  } catch (e) {
    console.error('❌ Failed to load Space-Track data:', e.message);
    return;
  }

  let merged = 0;
  let updated = 0;

  // Process each Space-Track satellite
  for (const sat of spacetrackData) {
    if (!sat.NORAD_CAT_ID || !sat.SATNAME) continue;

    const noradId = sat.NORAD_CAT_ID.toString();

    // Prepare alternative names array
    const alternativeNames = [];
    if (sat.OBJECT_NAME && sat.OBJECT_NAME !== sat.SATNAME) {
      alternativeNames.push(sat.OBJECT_NAME);
    }
    if (sat.INTLDES) {
      alternativeNames.push(sat.INTLDES);
    }

    // Remove duplicates
    const uniqueNames = [...new Set(alternativeNames)];

    if (cache.satellites[noradId]) {
      // Update existing entry if it has better data
      const existing = cache.satellites[noradId];
      if (existing.source !== 'spacetrack' && existing.source !== 'satnogs') {
        // Prefer Space-Track data over other sources
        existing.primaryName = sat.SATNAME;
        existing.alternativeNames = uniqueNames;
        existing.lastFetchedAt = new Date().toISOString();
        existing.source = 'spacetrack';
        updated++;
      }
    } else {
      // Add new entry
      cache.satellites[noradId] = {
        noradId,
        primaryName: sat.SATNAME,
        alternativeNames: uniqueNames,
        lastFetchedAt: new Date().toISOString(),
        source: 'spacetrack'
      };
      merged++;
    }
  }

  // Update cache metadata
  cache.lastUpdated = new Date().toISOString();
  cache.version = 3;
  cache.note = `Merged with Space-Track catalog (${Object.keys(cache.satellites).length} total satellites)`;

  // Save updated cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log(`\n✅ Merged ${merged} new satellites, updated ${updated} existing`);
  console.log(`📊 Total satellites in cache: ${Object.keys(cache.satellites).length}`);

  // Show breakdown by source
  const bySource = {};
  for (const [id, sat] of Object.entries(cache.satellites)) {
    const source = sat.source || 'unknown';
    bySource[source] = (bySource[source] || 0) + 1;
  }

  console.log('\n📊 Satellites by source:');
  for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${source}: ${count}`);
  }

  // Verify key satellites
  const testIds = ['43013', '25544', '1', '2'];
  console.log('\n🔍 Key satellites:');
  for (const id of testIds) {
    if (cache.satellites[id]) {
      console.log(`   NORAD ${id}: ${cache.satellites[id].primaryName}`);
    }
  }
}

mergeSpaceTrackData();
