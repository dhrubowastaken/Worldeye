import { normalizeAisMessage } from '@/features/traffic/providers/waterProvider';

describe('normalizeAisMessage', () => {
  test('maps cargo traffic to a civilian sea entity', () => {
    const entity = normalizeAisMessage({
      MessageType: 'PositionReport',
      MetaData: {
        MMSI: '123456789',
        ShipName: 'PACIFIC TRADER',
      },
      Message: {
        PositionReport: {
          Longitude: 120.3,
          Latitude: 14.6,
          Sog: 16,
          TrueHeading: 75,
          ShipType: 72,
        },
      },
    });

    expect(entity).toMatchObject({
      id: '123456789',
      kind: 'water',
      label: 'PACIFIC TRADER',
      classification: {
        category: 'civilian',
        system: 'Cargo',
      },
    });
  });
});
