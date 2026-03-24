import { useState, useEffect, useRef } from 'react';

// You need to register on aisstream.io for a free API key.
// Drop your key here or in an environment variable.
const AISSTREAM_API_KEY = import.meta.env.VITE_AISSTREAM_API_KEY || ''; 

export default function useWaterTraffic(viewState: any) {
  const [ships, setShips] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    if (!AISSTREAM_API_KEY) {
      console.warn("AISSTREAM_API_KEY is not set. Water traffic will not load.");
      return;
    }

    const connectToAISStream = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send a new subscription for the new bounding box
        const { latitude, longitude, zoom } = viewState;
        
        let boxSize = 2; // rough latitude degree bounds
        if (zoom > 5) boxSize = 1;
        if (zoom > 8) boxSize = 0.5;

        // Bounding box format: [[MinLatitude, MinLongitude], [MaxLatitude, MaxLongitude]]
        const subscriptionMessage = {
          APIKey: AISSTREAM_API_KEY,
          BoundingBoxes: [[[latitude - boxSize, longitude - boxSize], [latitude + boxSize, longitude + boxSize]]]
        };
        
        wsRef.current.send(JSON.stringify(subscriptionMessage));
      } else if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        wsRef.current = new WebSocket("wss://stream.aisstream.io/v0/stream");
        
        wsRef.current.onopen = () => {
          connectToAISStream(); // call recursively once open to send the bounding box
        };
        
        wsRef.current.onmessage = (event) => {
          const aisMessage = JSON.parse(event.data);
          if (aisMessage.MessageType === "PositionReport" || aisMessage.MessageType === "StandardClassBPositionReport") {
             const report = aisMessage.Message.PositionReport || aisMessage.Message.StandardClassBPositionReport;
             
             setShips(prev => {
                const newData = [...prev];
                const existingIdx = newData.findIndex(s => s.id === aisMessage.MetaData.MMSI);
                
                // ShipType 35 roughly maps to military, others to civilian/commercial
                const isMil = report.ShipType === 35 || report.ShipType === 30;
                const category = isMil ? 'military' : 'civilian';
                let system = 'Commercial Marine';
                if (report.ShipType >= 70 && report.ShipType <= 79) system = 'Cargo';
                if (report.ShipType >= 80 && report.ShipType <= 89) system = 'Tanker';

                const newShip = {
                  id: aisMessage.MetaData.MMSI,
                  type: 'water',
                  category,
                  system,
                  name: aisMessage.MetaData.ShipName ? aisMessage.MetaData.ShipName.trim() : `MMSI: ${aisMessage.MetaData.MMSI}`,
                  coordinates: [report.Longitude, report.Latitude, 0],
                  speed: report.Sog || 0,
                  track: report.TrueHeading || 0
                };
                
                if (existingIdx !== -1) {
                  newData[existingIdx] = newShip;
                } else {
                  newData.push(newShip);
                }
                // keep max 1000 ships in memory so we don't blow up browser
                if (newData.length > 500) newData.shift();
                return newData;
             });
          }
        };

        wsRef.current.onerror = (error) => {
          console.error("AIS WebSocket error:", error);
        };
      }
    };

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(connectToAISStream, 1500);

    return () => clearTimeout(debounceTimer.current);
  }, [viewState]);

  return ships;
}
