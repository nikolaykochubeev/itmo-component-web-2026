import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile, symlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'course48-docker-'));
const context = join(temporary, 'context');
const image = `course48-fs-selftest:${process.pid}`;
// This is the example number printed in the assignment PDF, never the user's ISU.
const fixtureIsu = '307482';
const originalConfiguration = await readFile(join(project, 'student.json'), 'utf8');

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `docker ${args[0]} failed:\n${result.stderr}\n${result.stdout}`);
  return result;
}

try {
  await mkdir(context);
  for (const file of ['Dockerfile', 'package.json', 'index.mjs', 'src']) {
    await cp(join(project, file), join(context, file), { recursive: true });
  }
  await writeFile(join(context, 'student.json'), JSON.stringify({ isu: fixtureIsu }));
  docker(['build', '--platform', 'linux/amd64', '-t', image, context]);
  assert.equal(docker(['image', 'inspect', '--format', '{{.Os}}/{{.Architecture}}', image]).stdout.trim(), 'linux/amd64');

  const cases = [
    { name: 'empty', expected: '307482-0-0-0\n', populate: async () => {} },
    { name: 'only-directories', expected: '307482-0-3-0\n', populate: async root => {
      await mkdir(join(root, 'a', 'b'), { recursive: true }); await mkdir(join(root, 'empty'));
    } },
    { name: 'mixed', expected: '307482-4-3-850\n', populate: async root => {
      await mkdir(join(root, 'docs', 'old'), { recursive: true }); await mkdir(join(root, 'empty'));
      for (const [name, size] of [['a.txt', 100], ['b.txt', 500], ['docs/c.txt', 200], ['docs/old/d.txt', 50]]) {
        await writeFile(join(root, name), Buffer.alloc(size));
      }
      await symlink('/data', join(root, 'loop')); await symlink('/outside', join(root, 'broken'));
    } },
    { name: 'spaces-and-utf8', expected: '307482-3-0-15\n', populate: async root => {
      await writeFile(join(root, 'a b.txt'), 'Привет'); await writeFile(join(root, '.hidden'), 'abc'); await writeFile(join(root, 'zero'), '');
    } }
  ];

  for (const entry of cases) {
    const root = join(temporary, entry.name);
    await mkdir(root); await entry.populate(root);
    const result = docker(['run', '--rm', '--platform', 'linux/amd64', '--network', 'none', '--read-only', '--mount', `type=bind,source=${root},target=/data,readonly`, image]);
    assert.equal(result.stdout, entry.expected, `${entry.name}: stdout contract`);
    assert.equal(result.stderr, '', `${entry.name}: unexpected stderr`);
    console.log(`PASS Docker: ${entry.name} → ${result.stdout.trim()}`);
  }
  assert.equal(await readFile(join(project, 'student.json'), 'utf8'), originalConfiguration, 'self-test must leave real student configuration untouched');
  console.log('PASS linux/amd64; read-only /data; network disabled; original ISU untouched');
} finally {
  spawnSync('docker', ['image', 'rm', '-f', image], { stdio: 'ignore' });
  await rm(temporary, { recursive: true, force: true });
}
