import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/adsb/:path*',
        destination: 'https://api.adsb.lol/:path*',
      },
      {
        source: '/api/celestrak/:path*',
        destination: 'https://celestrak.org/:path*',
      },
      {
        source: '/api/space-track/:path*',
        destination: 'https://www.space-track.org/:path*',
      },
    ];
  },
};

export default nextConfig;
