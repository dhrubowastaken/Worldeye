#!/usr/bin/env node
/**
 * Script to merge SatNOGS satellite database with our existing cache
 * SatNOGS provides 2600+ satellites with NORAD IDs and names
 * Run: node scripts/merge-satnogs-data.cjs
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../public/data/satellite-names.json');
const SATNOGS_FILE = path.join(__dirname, '../satnogs_satellites.json');

function mergeSatnogsData() {
  console.log('🛰️  Merging SatNOGS satellite database...\n');

  // Load existing cache
  let cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`📡 Loaded existing cache with ${Object.keys(cache.satellites).length} satellites`);
  } catch (e) {
    console.error('❌ Failed to load existing cache:', e.message);
    return;
  }

  // Load SatNOGS data
  let satnogsData;
  try {
    satnogsData = JSON.parse(fs.readFileSync(SATNOGS_FILE, 'utf8'));
    console.log(`📡 Loaded SatNOGS data with ${satnogsData.length} satellites`);
  } catch (e) {
    console.error('❌ Failed to load SatNOGS data:', e.message);
    return;
  }

  let merged = 0;
  let updated = 0;

  // Process each SatNOGS satellite
  for (const sat of satnogsData) {
    if (!sat.norad_cat_id || !sat.name) continue;

    const noradId = sat.norad_cat_id.toString();

    // Prepare alternative names array
    const alternativeNames = [];
    if (sat.names && sat.names.trim()) {
      alternativeNames.push(sat.names.trim());
    }

    if (cache.satellites[noradId]) {
      // Update existing entry if it has better data
      const existing = cache.satellites[noradId];
      if (!existing.alternativeNames.length && alternativeNames.length) {
        existing.alternativeNames = alternativeNames;
        existing.lastFetchedAt = new Date().toISOString();
        existing.source = 'satnogs';
        updated++;
      }
    } else {
      // Add new entry
      cache.satellites[noradId] = {
        noradId,
        primaryName: sat.name.trim(),
        alternativeNames,
        lastFetchedAt: new Date().toISOString(),
        source: 'satnogs'
      };
      merged++;
    }
  }

  // Update cache metadata
  cache.lastUpdated = new Date().toISOString();
  cache.version = 2;
  cache.note = `Merged with SatNOGS database (${Object.keys(cache.satellites).length} total satellites)`;

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

  // Verify NORAD 43013 is correct
  if (cache.satellites['43013']) {
    console.log(`\n✅ NORAD 43013: ${cache.satellites['43013'].primaryName}`);
  }
}

mergeSatnogsData();
