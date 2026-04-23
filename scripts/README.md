# Scripts

The no-key rebuild no longer ships cache-building or data-merge scripts for
provider data. Runtime source data is fetched live, normalized in application
code, and kept only in memory for the current session.

Do not add scripts that:

- rebuild committed provider data under `public/data`
- enrich source payloads with credentialed or downloaded side files
- write live source snapshots into local files for app startup

If a source needs preprocessing, keep it ephemeral and testable inside the
typed source/runtime modules under `src/features/sources`.
