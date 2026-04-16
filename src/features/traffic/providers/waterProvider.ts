import type { TrackedEntity, ViewportQuery } from '@/features/traffic/types';
import type { DataProvider, ProviderFetchResult } from '@/features/traffic/providers/types';

const AISSTREAM_API_KEY = process.env.NEXT_PUBLIC_AISSTREAM_API_KEY || '';
const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream';

interface AisMetadata {
  MMSI: string;
  ShipName?: string;
}

interface AisPositionReport {
  Longitude: number;
  Latitude: number;
  Sog?: number;
  TrueHeading?: number;
  ShipType?: number;
}

interface AisEnvelope {
  MessageType: string;
  MetaData: AisMetadata;
  Message: {
    PositionReport?: AisPositionReport;
    StandardClassBPositionReport?: AisPositionReport;
  };
}

function resolveShipSystem(shipType?: number): string {
  if (typeof shipType !== 'number') {
    return 'Commercial Marine';
  }

  if (shipType >= 70 && shipType <= 79) {
    return 'Cargo';
  }

  if (shipType >= 80 && shipType <= 89) {
    return 'Tanker';
  }

  return 'Commercial Marine';
}

export function normalizeAisMessage(message: AisEnvelope): TrackedEntity | null {
  const report =
    message.Message.PositionReport ?? message.Message.StandardClassBPositionReport;

  if (!report) {
    return null;
  }

  const isMilitary = report.ShipType === 35 || report.ShipType === 30;

  return {
    id: message.MetaData.MMSI,
    kind: 'water',
    label: message.MetaData.ShipName?.trim() || `MMSI ${message.MetaData.MMSI}`,
    classification: {
      category: isMilitary ? 'military' : 'civilian',
      system: isMilitary ? 'Defense Maritime' : resolveShipSystem(report.ShipType),
    },
    coordinates: {
      longitude: report.Longitude,
      latitude: report.Latitude,
      altitude: 0,
    },
    freshness: {
      updatedAt: new Date().toISOString(),
      stale: false,
    },
    providerId: 'water-provider',
    metrics: {
      heading: report.TrueHeading ?? 0,
      speed: report.Sog ?? 0,
    },
    metadata: {
      messageType: message.MessageType,
    },
  };
}

function createHealth(
  summary: string,
  status: 'ready' | 'degraded' | 'loading' = 'ready',
): ProviderFetchResult<TrackedEntity>['health'] {
  return {
    providerId: 'water-provider',
    status,
    summary,
    updatedAt: new Date().toISOString(),
    retryable: true,
  };
}

export function createWaterProvider(): DataProvider<TrackedEntity> {
  let socket: WebSocket | null = null;
  const cache = new Map<string, TrackedEntity>();

  const ensureConnection = (query: ViewportQuery): void => {
    if (!AISSTREAM_API_KEY) {
      return;
    }

    const boxPadding = query.detail === 'high' ? 0.5 : query.detail === 'medium' ? 1.25 : 2.25;

    const sendSubscription = (client: WebSocket) => {
      client.send(
        JSON.stringify({
          APIKey: AISSTREAM_API_KEY,
          BoundingBoxes: [[
            [query.center[1] - boxPadding, query.center[0] - boxPadding],
            [query.center[1] + boxPadding, query.center[0] + boxPadding],
          ]],
        }),
      );
    };

    if (socket?.readyState === WebSocket.OPEN) {
      sendSubscription(socket);
      return;
    }

    if (socket?.readyState === WebSocket.CONNECTING) {
      return;
    }

    socket = new WebSocket(AISSTREAM_URL);
    socket.onopen = () => {
      if (socket) {
        sendSubscription(socket);
      }
    };
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as AisEnvelope;
        const entity = normalizeAisMessage(parsed);
        if (entity) {
          cache.set(entity.id, entity);
        }
      } catch {
        // Ignore malformed messages from the provider.
      }
    };
  };

  return {
    id: 'water-provider',
    kind: 'water',
    capabilities: {
      mode: 'hybrid',
      supportsViewportQueries: true,
    },
    async fetchSnapshot(query): Promise<ProviderFetchResult<TrackedEntity>> {
      if (!AISSTREAM_API_KEY) {
        return {
          entities: [],
          health: createHealth(
            'AISStream API key missing. Sea traffic disabled.',
            'degraded',
          ),
        };
      }

      ensureConnection(query);

      return {
        entities: [...cache.values()],
        health: createHealth(
          socket?.readyState === WebSocket.OPEN
            ? `Tracking ${cache.size} vessels`
            : 'Connecting to AIS stream...',
          socket?.readyState === WebSocket.OPEN ? 'ready' : 'loading',
        ),
      };
    },
    teardown() {
      socket?.close();
      socket = null;
      cache.clear();
    },
  };
}
