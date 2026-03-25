# Data Files

This directory contains pre-built data files that are shared across the project. These files are tracked using [Git LFS (Large File Storage)](https://git-lfs.com/) to keep the repository size manageable without losing version history.

## Files

### `satellite-names.json`

Pre-generated satellite name mapping cache with NORAD catalog IDs to canonical names.

**Size:** ~15 MB (68,700+ satellites)  
**Source:** Merged from:
- Space-Track.org SATCAT (68,188 satellites)
- SatNOGS Database (2,607 satellites)

**Content Structure:**
```json
{
  "satellites": {
    "25544": {
      "noradId": "25544",
      "primaryName": "ISS (ZARYA)",
      "alternativeNames": [],
      "lastFetchedAt": "2026-03-25T...",
      "source": "space-track"
    },
    ...
  },
  "lastUpdated": "2026-03-25T...",
  "version": 1
}
```

**Why Pre-built?**
- Regenerating from Space-Track requires API credentials and account approval
- Each download counts against rate limits
- Building the cache from scratch takes several minutes
- Pre-built file eliminates this step for contributors

### `satellite-category-map.json`

Classification rules and keyword mappings for satellite categorization (civilian/military/research).

**Content Structure:**
```json
{
  "keywords": {
    "civilian": ["STARLINK", "ONEWEB", "IRIDIUM", ...],
    "research": ["ISS", "HUBBLE", "NOAA", ...],
    "military": ["GPS", "GLONASS", "USA", "JSS", ...]
  },
  "systems": {
    "STARLINK": "SpaceX",
    "ISS": "Science/Gov",
    "GPS": "Defense/GPS",
    ...
  },
  "fallbackRegex": {
    "research": "\\b(ISS|HUBBLE|...)\\b",
    "military": "\\b(GPS|GLONASS|...)\\b",
    "numericNorad": "^\\d+$|NORAD\\s*\\d+",
    "defaultResearch": "Research/Unknown satellite or NORAD numeric ID"
  }
}
```

**Usage:** Loaded at runtime by satellite classification system. Users can modify keywords/systems without touching code.

## Modifying Classifications

To add or modify satellite classifications:

1. Edit `data/satellite-category-map.json`
2. Add keywords to `keywords.civilian`, `keywords.research`, or `keywords.military`
3. Add system mappings in `systems` section if needed
4. Save and reload the app (no code changes or build required)


For any new large data files (GeoJSON, CSV, databases, etc.):

1. **Place in this directory** (`data/`)
2. **Update `.gitattributes`** to track with LFS if > 5MB:
   ```text
   data/mynewfile.* diff=lfs merge=lfs -text
   ```
3. **Document in this README** with format, source, and purpose
4. **Update build scripts** to load from this directory path

## Build Scripts (Optional)

These scripts regenerate data from source APIs. **They are optional**—pre-built files are already included.

See [../scripts/README.md](../scripts/README.md) for detailed documentation.

Quick rebuild:
```bash
npm run build:satellites
```

This updates `data/satellite-names.json` with fresh satellite data.

## Git LFS

If you haven't already, install Git LFS:

```bash
# On macOS
brew install git-lfs

# On Windows (with Chocolatey)
choco install git-lfs

# On Linux (Ubuntu/Debian)
sudo apt-get install git-lfs
```

Then initialize in this repo:
```bash
git lfs install
```

Clone with LFS:
```bash
git clone --recurse-submodules <repo-url>
# or
git lfs pull
```
