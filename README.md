# WorldEye

A real-time global monitoring dashboard for tracking air traffic, space traffic (satellites), and maritime vessels on an interactive globe.

## Features

- **Real-time Air Traffic**: ADSB-based aircraft tracking with callsigns and classifications
- **Satellite Tracking**: 68k+ satellite catalog with TLE data, comprehensive name resolution from cached database
- **Maritime Monitoring**: Ship position tracking from AIS data
- **Advanced Filtering**: Filter by classification (civilian/military/research), system/company, and entity search
- **Interactive Globe**: Zoom, pan, and inspect individual entities with detailed information
- **Multi-layer Visualization**: Color-coded by category, size adjusted by altitude/orbital characteristics

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Mapping**: DeckGL with Globe View
- **Data Sources**: 
  - AIS (via adsb.lol)
  - Satellites (SatNOGS TLE database + Space-Track)
  - TLE propagation (satellite.js library)

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory (or set these in your deployment):

```env
VITE_N2YO_API_KEY=your_n2yo_api_key_here
VITE_SPACE_TRACK_USERNAME=your_spacetrack_username
VITE_SPACE_TRACK_PASSWORD=your_spacetrack_password
```

**Note**: N2YO API key is optional but recommended for better satellite name resolution. Space-Track credentials are optional but provide access to a much larger satellite catalog.

### Git LFS (Large File Storage)

This project uses Git LFS to manage large data files like the satellite database without bloating the repository.

**Initial Setup** (one-time):
```bash
# Install Git LFS
git lfs install

# Clone with LFS support
git clone --recurse-submodules <repo-url>
cd worldeye
```

**Pulling LFS files**:
```bash
git lfs pull
```

The `data/` directory contains pre-built data files (satellite-names.json, satellite-category-map.json, etc.) tracked via Git LFS. These files are provided to avoid rebuild time and API credit consumption. See [data/README.md](./data/README.md) for details.

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build

```bash
npm run build
npm run preview
```

### Optional: Rebuilding Data from Source

If you want to regenerate satellite data from fresh API calls (requires Space-Track credentials):

```bash
npm run build:satellites
```

This will fetch from Space-Track and SatNOGS APIs and update `data/satellite-names.json`. See [scripts/README.md](./scripts/README.md) for details.


## Project Structure

```
src/
├── components/          # React UI components (globe visualization, loading indicators, state management)
├── hooks/               # Custom React hooks for data fetching (air traffic, satellites, maritime vessels)
├── utils/               # Utility functions (icon generation, satellite classification, name resolution)
├── App.tsx              # Main application entry point
└── main.tsx             # React DOM render

data/
├── satellite-names.json          # Pre-generated satellite name cache (68k+ satellites via Git LFS)
├── satellite-category-map.json   # Satellite classification keywords and system mappings
└── README.md                      # Data directory documentation

public/
├── favicon.svg          # Site favicon
└── icons.svg            # SVG icon definitions

scripts/
├── build-satellite-names.cjs      # Fetch satellite data from CelesTrak
├── merge-satnogs-data.cjs         # Merge SatNOGS database into cache
├── merge-spacetrack-data.cjs      # Merge Space-Track catalog into cache
└── README.md                       # Script documentation & usage
```

## Classification System

Entities are classified as:
- **Civilian**: Commercial flights, Starlink, OneWeb, commercial shipping
- **Military**: Military aircraft/UAVs, GPS/GLONASS/BEIDOU satellites, defense communications
- **Research**: ISS, Earth observation satellites, scientific missions

## Data Flow

1. **Space Traffic**: SatNOGS API → TLE parsing → Satellite.js propagation → Name resolution from cache → Classification
2. **Air Traffic**: ADSB.lol API → Aircraft position/callsign → Classification
3. **Water Traffic**: AIS data → Vessel position/name → Classification

All data is rendered on the globe only after all sources have completed loading and merging.


