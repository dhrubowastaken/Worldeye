# Build Scripts

These scripts fetch fresh satellite data from external sources and rebuild the data caches. **They are optional**—pre-built data files are already included in the `data/` directory.

## When to Use Scripts

- **Rebuilding from scratch**: Regenerate satellite name cache with latest data
- **Adding new data sources**: Extend categorization or mappings
- **Development**: Test changes to data processing pipeline

## Prerequisites

For Space-Track data (largest catalog), you need:
- Space-Track.org account (free, requires approval)
- API credentials in `.env`:
  ```env
  VITE_SPACE_TRACK_USERNAME=your_username
  VITE_SPACE_TRACK_PASSWORD=your_password
  ```

## Scripts

### `build-satellite-names.cjs`
Fetches satellite TLE data from CelesTrak and creates initial cache.

```bash
node scripts/build-satellite-names.cjs
```

Outputs: `data/satellite-names.json` (initial batch)

### `merge-satnogs-data.cjs`
Merges SatNOGS satellite database into the cache.

```bash
node scripts/merge-satnogs-data.cjs
```

Requires: `data/satellite-names.json` (from build-satellite-names.cjs)  
Outputs: `data/satellite-names.json` (expanded)

### `merge-spacetrack-data.cjs`
Merges comprehensive Space-Track SATCAT into cache (largest dataset).

```bash
node scripts/merge-spacetrack-data.cjs
```

Requires: 
- `data/satellite-names.json` (from previous steps)
- Space-Track API credentials in `.env`

Outputs: `data/satellite-names.json` (final, 68k+ satellites)

## Building Fresh Cache

To rebuild all data from scratch:

```bash
npm run build:satellites
```

Or manually:
```bash
node scripts/build-satellite-names.cjs
node scripts/merge-satnogs-data.cjs
node scripts/merge-spacetrack-data.cjs
```

This takes ~5-10 minutes depending on API response times.

## Adding New Data Sources

1. Create a new script: `merge-SOURCENAME-data.cjs`
2. Read from existing `data/satellite-names.json`
3. Merge your data
4. Write back to `data/satellite-names.json`
5. Update `npm run build:satellites` in `package.json` to include your script

## Adding New Classification Maps

If you extend satellite categorizations:

1. Update `data/satellite-category-map.json`
2. Restart dev server or build
3. No code changes needed—mapping loads automatically at runtime

## Troubleshooting

**"Space-Track authentication failed"**
- Verify credentials in `.env`
- Check Space-Track.org account status

**"Rate limited"**
- Space-Track has daily limits (usually 4000+ requests)
- Wait and retry tomorrow

**Large file sizes**
- Pre-built cache is 14.5 MB (tracked via Git LFS)
- Rebuild creates temporary JSON files during merge; clean up with `npm run clean` if needed
