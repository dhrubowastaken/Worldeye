# Data Refresh Scripts

These scripts are optional maintenance tools for rebuilding the committed orbital
name catalog in `public/data/`. The app works after a normal clone and install;
you only need these when you want to refresh or enrich the shipped catalog.

## Runtime Output

- `public/data/satellite-names.json`

## Scripts

### `node scripts/build-satellite-names.cjs`

Builds the initial cache from public CelesTrak feeds.

### `node scripts/merge-satnogs-data.cjs`

Merges a downloaded SatNOGS dataset into the existing cache.

### `node scripts/merge-spacetrack-data.cjs`

Merges a downloaded Space-Track SATCAT export into the existing cache.

## One-shot rebuild

```bash
npm run build:satellites
```

## Notes

- The project no longer relies on Git LFS. The runtime catalog is committed
  directly so `git clone` is enough to boot the app.
- Classification logic now lives in typed source under `src/features/traffic/`
  rather than a duplicate public JSON file.
