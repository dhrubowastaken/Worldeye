import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('scripts README', () => {
  test('describes the source-based runtime without deleted cache script references', () => {
    const root = path.resolve(__dirname, '..', '..');
    const readme = readFileSync(path.join(root, 'scripts', 'README.md'), 'utf8');

    expect(readme).toContain('Runtime source data is fetched live');
    expect(readme).not.toContain('optional-data-input');
    expect(readme).not.toContain('build-satellite-name');
    expect(readme).not.toContain('merge-satnogs-data');
    expect(readme).not.toContain('merge-spacetrack-data');
  });

  test('does not advertise the removed satellite cache build npm script', () => {
    const root = path.resolve(__dirname, '..', '..');
    const packageJson = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['build:satellites']).toBeUndefined();
  });
});
