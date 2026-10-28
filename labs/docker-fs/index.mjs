import { readFile } from 'node:fs/promises';
import { analyzeDirectory, formatResult } from './src/analyze.mjs';

try {
  const { isu } = JSON.parse(await readFile(new URL('./student.json', import.meta.url), 'utf8'));
  // Validate the signature before touching the input; stdout stays empty on failure.
  formatResult(isu, { files: 0, directories: 0, size: 0n });
  process.stdout.write(formatResult(isu, await analyzeDirectory('/data')));
} catch (error) {
  process.stderr.write(`Filesystem analysis failed: ${error.message}\n`);
  process.exitCode = 1;
}
