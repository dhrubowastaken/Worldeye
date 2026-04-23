import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_FILE_PATTERN = /\.(ts|tsx|js|cjs|mjs)$/;

export interface RuntimeMatch {
  file: string;
  line: number;
  text: string;
  pattern: string;
}

export function collectRuntimeFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return collectRuntimeFiles(fullPath);
    }

    return RUNTIME_FILE_PATTERN.test(entry.name) ? [fullPath] : [];
  });
}

export function findRuntimeMatches(
  files: string[],
  patterns: RegExp[],
): RuntimeMatch[] {
  return files.flatMap((file) => {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

    return lines.flatMap((line, index) =>
      patterns
        .filter((pattern) => pattern.test(line))
        .map((pattern) => ({
          file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
          line: index + 1,
          text: line.trim(),
          pattern: String(pattern),
        })),
    );
  });
}

export function loadContractModule<TModule>(modulePath: string): TModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(modulePath) as TModule;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Expected ${modulePath} to exist for the no-key source architecture.\n${detail}`,
    );
  }
}
