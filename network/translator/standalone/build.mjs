import { readFile, writeFile } from 'node:fs/promises';

const file = name => new URL(name, import.meta.url);
const [template, dictionary, verifiedLookups, source, verifiedSource] = await Promise.all([
  readFile(file('index.template.html'), 'utf8'),
  readFile(file('data/freedict-rus-eng.json'), 'utf8').then(JSON.parse),
  readFile(file('data/verified-lookups.json'), 'utf8').then(JSON.parse),
  readFile(file('data/SOURCE.json'), 'utf8').then(JSON.parse),
  readFile(file('data/verified-lookups-source.json'), 'utf8').then(JSON.parse)
]);
const marker = '__OFFLINE_DICTIONARY_JSON__';
if (template.split(marker).length !== 2) throw new Error('Expected one dictionary placeholder');
const data = JSON.stringify({ dictionary, verifiedLookups, source, verifiedSource })
  .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const html = template.replace(marker, () => data);
await writeFile(file('index.html'), html);
if (process.argv.includes('--docs')) await writeFile(file('../../../docs/index.html'), html);
console.log(JSON.stringify({ bytes: Buffer.byteLength(html), headwords: Object.keys(dictionary).length, cachedLookups: Object.keys(verifiedLookups).length, docs: process.argv.includes('--docs') }));
