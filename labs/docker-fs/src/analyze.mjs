import { lstat, readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function analyzeDirectory(root = '/data') {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory()) throw new Error('Input root must be a directory');

  const result = { files: 0, directories: 0, size: 0n };
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const name of await readdir(current)) {
      const path = join(current, name);
      const entry = await lstat(path, { bigint: true });
      if (entry.isDirectory()) {
        result.directories += 1;
        pending.push(path);
      } else if (entry.isFile()) {
        result.files += 1;
        result.size += entry.size;
      }
    }
  }
  return result;
}

export function formatResult(isu, { files, directories, size }) {
  if (typeof isu !== 'string' || !/^\d{6}$/.test(isu)) {
    throw new Error('ISU must be your real six-digit student number; run npm run configure -- <ISU>');
  }
  return `${isu}-${files}-${directories}-${size}\n`;
}
