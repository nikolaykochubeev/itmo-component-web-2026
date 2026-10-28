import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { analyzeDirectory, formatResult } from '../src/analyze.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'course48-fs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('empty root is excluded from directory count', async (t) => {
  assert.deepEqual(await analyzeDirectory(await fixture(t)), { files: 0, directories: 0, size: 0n });
});

test('counts nested empty directories and byte sizes of ordinary files', async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, 'docs', 'old'), { recursive: true });
  await mkdir(join(root, 'empty'));
  await writeFile(join(root, 'a.txt'), Buffer.alloc(100));
  await writeFile(join(root, 'b.txt'), Buffer.alloc(500));
  await writeFile(join(root, 'docs', 'c.txt'), Buffer.alloc(200));
  await writeFile(join(root, 'docs', 'old', 'd.txt'), Buffer.alloc(50));
  assert.deepEqual(await analyzeDirectory(root), { files: 4, directories: 3, size: 850n });
});

test('counts spaces, hidden names, Unicode bytes and zero length files', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'a b.txt'), 'Привет'); // 12 UTF-8 bytes.
  await writeFile(join(root, '.hidden'), 'abc');
  await writeFile(join(root, 'zero'), '');
  assert.deepEqual(await analyzeDirectory(root), { files: 3, directories: 0, size: 15n });
});

test('ignores symlinks to files, outside directories and loops', async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, 'real'));
  await writeFile(join(root, 'real', 'a'), 'abc');
  await symlink(join(root, 'real', 'a'), join(root, 'file-link'));
  await symlink(root, join(root, 'real', 'loop'));
  await symlink('/tmp', join(root, 'outside'));
  await symlink(join(root, 'absent'), join(root, 'broken'));
  assert.deepEqual(await analyzeDirectory(root), { files: 1, directories: 1, size: 3n });
});

test('fails on a missing root or a regular file root', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, 'file'), 'abc');
  await assert.rejects(analyzeDirectory(join(root, 'missing')));
  await assert.rejects(analyzeDirectory(join(root, 'file')));
});

test('formats one line and preserves integers larger than Number.MAX_SAFE_INTEGER', () => {
  assert.equal(formatResult('307482', { files: 4, directories: 3, size: 850n }), '307482-4-3-850\n');
  assert.equal(formatResult('307482', { files: 1, directories: 0, size: 9007199254740993n }), '307482-1-0-9007199254740993\n');
});

test('rejects missing or invalid ISU instead of impersonating a student', () => {
  for (const isu of [null, '', '12345', '1234567', 'abc123', 307482]) {
    assert.throws(() => formatResult(isu, { files: 0, directories: 0, size: 0n }), /ISU/);
  }
});
