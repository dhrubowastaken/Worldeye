import path from 'node:path';

import {
  collectRuntimeFiles,
  findRuntimeMatches,
  loadContractModule,
} from '../helpers/noKeyContracts';

interface SourceAuthMetadata {
  type: 'none';
  requiresKey: false;
  notes?: string;
}

interface SourceDefinitionContract {
  id: string;
  label: string;
  domain: string;
  auth: SourceAuthMetadata;
  cadenceMs: number;
  timeoutMs: number;
  attribution: string;
  termsUrl: string;
}

interface DataPointGroupContract {
  sources: Array<{ sourceId: string }>;
}

function loadSourceRegistry() {
  return loadContractModule<{
    SOURCE_DEFINITIONS: SourceDefinitionContract[];
    DATA_POINT_GROUPS: DataPointGroupContract[];
  }>('@/features/sources/sourceRegistry');
}

describe('no-key source contracts', () => {
  test('declares explicit no-auth metadata for every source exposed in data-point groups', () => {
    const { SOURCE_DEFINITIONS, DATA_POINT_GROUPS } = loadSourceRegistry();
    const sourceIds = SOURCE_DEFINITIONS.map((source) => source.id);
    const groupedSourceIds = DATA_POINT_GROUPS.flatMap((group) =>
      group.sources.map((source) => source.sourceId),
    );

    expect(SOURCE_DEFINITIONS.length).toBeGreaterThan(0);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect([...groupedSourceIds].sort()).toEqual([...sourceIds].sort());

    SOURCE_DEFINITIONS.forEach((source) => {
      expect(source).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
          label: expect.any(String),
          domain: expect.any(String),
          cadenceMs: expect.any(Number),
          timeoutMs: expect.any(Number),
          attribution: expect.any(String),
          termsUrl: expect.stringMatching(/^https:\/\//),
        }),
      );
      expect(source.cadenceMs).toBeGreaterThan(0);
      expect(source.timeoutMs).toBeGreaterThan(0);
      expect(source.auth).toEqual(
        expect.objectContaining({
          type: 'none',
          requiresKey: false,
        }),
      );
      expect(Object.keys(source.auth)).not.toEqual(
        expect.arrayContaining(['apiKey', 'envKey', 'secretEnvVar', 'token', 'headerName']),
      );
    });
  });

  test('keeps source/provider runtime code free of API-key contracts', () => {
    const projectRoot = process.cwd();
    const files = [
      ...collectRuntimeFiles(path.join(projectRoot, 'src')),
      path.join(projectRoot, 'next.config.ts'),
    ].filter((file) => !file.endsWith(path.join('src', 'lib', 'preferences.ts')));

    expect(
      findRuntimeMatches(files, [
        /NEXT_PUBLIC_[A-Z0-9_]*(?:API|KEY|TOKEN|SECRET)[A-Z0-9_]*/i,
        /process\.env\.[A-Z0-9_]*(?:API|KEY|TOKEN|SECRET)[A-Z0-9_]*/i,
        /\b(?:APIKey|apiKey|api_key)\b/,
        /\b(?:AISSTREAM|SPACE[_-]?TRACK|SPACETRACK|N2YO)\b/i,
        /API key (?:missing|required)/i,
      ]),
    ).toEqual([]);
  });

  test('does not fetch or persist provider data through runtime caches or public data artifacts', () => {
    const projectRoot = process.cwd();
    const files = [
      ...collectRuntimeFiles(path.join(projectRoot, 'src', 'features', 'traffic', 'providers')),
      ...collectRuntimeFiles(path.join(projectRoot, 'src', 'features', 'sources')),
      ...collectRuntimeFiles(path.join(projectRoot, 'src', 'features', 'world-eye')),
      path.join(projectRoot, 'next.config.ts'),
    ];

    expect(
      findRuntimeMatches(files, [
        /\b(?:localStorage|sessionStorage|indexedDB)\b/,
        /\b(?:CACHE_KEY|Cached[A-Z]\w+|isCached\w+Fresh|loadCached\w+|saveCached\w+)\b/,
        /\bcache\s*=\s*new Map\b/i,
        /\bcache\.(?:set|get|values|clear|delete)\b/i,
        /(?:public\/data|\/data\/|satellite-names\.json)/i,
      ]),
    ).toEqual([]);
  });
});
