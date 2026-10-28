import { writeFile } from 'node:fs/promises';

const [isu, ...extra] = process.argv.slice(2);
if (!/^\d{6}$/.test(isu ?? '') || extra.length) {
  process.stderr.write('Usage: npm run configure -- <your real six-digit ISU>\n');
  process.exitCode = 1;
} else {
  await writeFile(new URL('../student.json', import.meta.url), `${JSON.stringify({ isu }, null, 2)}\n`);
  process.stdout.write('Student signature configured. Rebuild the Docker image before submission.\n');
}
