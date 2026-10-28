import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const createJestConfig = require('react-scripts/scripts/utils/createJestConfig.js');
const defaults = createJestConfig(path => require.resolve(`react-scripts/${path}`), root);

// CRA 3 otherwise treats .mjs imports as assets. Keep its pinned transforms,
// adding the same Babel transform before the asset fallback for ES modules.
const transform = {
  '^.+\\.mjs$': require.resolve('react-scripts/config/jest/babelTransform.js'),
  ...defaults.transform
};

const result = spawnSync(process.execPath, [
  require.resolve('react-scripts/bin/react-scripts.js'),
  'test', '--env=jsdom', '--transform', JSON.stringify(transform),
  ...process.argv.slice(2)
], { cwd: root, stdio: 'inherit' });

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
