import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

// Plugin to serve data files from /data directory in dev
function serveDataFiles() {
  return {
    name: 'serve-data-files',
    configureServer(server: any) {
      return () => {
        server.middlewares.use('/data/', (req: any, res: any, next: any) => {
          const fileName = req.url.split('/')[1];
          if (fileName) {
            const filePath = path.join(__dirname, 'data', fileName);
            if (fs.existsSync(filePath)) {
              const content = fs.readFileSync(filePath);
              res.setHeader('Content-Type', 'application/json');
              res.end(content);
              return;
            }
          }
          next();
        });
      };
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), serveDataFiles()],
  server: {
    proxy: {
      '/api/adsb': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/adsb/, '')
      },
      '/api/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/celestrak/, '')
      },
      '/api/space-track': {
        target: 'https://www.space-track.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/space-track/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('User-Agent', 'WorldEye/1.0');
          });
        }
      }
    }
  }
});
