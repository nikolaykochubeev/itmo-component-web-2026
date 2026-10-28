import { readFile, writeFile } from 'node:fs/promises';

const [name, ...extra] = process.argv.slice(2);
if (!/^@[a-z0-9][a-z0-9._-]*\/page-preview$/.test(name ?? '') || extra.length) {
  console.error('Usage: npm run prepare:publish -- @your-owned-npm-scope/page-preview');
  process.exitCode = 1;
} else {
  const path = new URL('../package.json', import.meta.url);
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  manifest.name = name;
  delete manifest.private;
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Prepared ${name}@${manifest.version}; verify npm whoami and ownership before publishing.`);
}
