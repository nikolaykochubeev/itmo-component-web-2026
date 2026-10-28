import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = new URL('../src/SubscribeForm.jsx', import.meta.url);
const original = readFileSync(source, 'utf8');
const target = '<button type="submit" disabled={isSaving}>';
const broken = '<button type="submit">';
const filter = 'блокирует повторную отправку';
let restored = false;

function restore() {
  if (!restored) {
    writeFileSync(source, original);
    restored = true;
  }
}

process.on('SIGINT', () => { restore(); process.exit(130); });
process.on('SIGTERM', () => { restore(); process.exit(143); });
process.on('exit', restore);

function run(args) {
  const result = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  return result;
}

try {
  if (original.split(target).length !== 2) {
    throw new Error('Маркер кнопки изменился. Код не меняли. Проверьте сценарий вручную.');
  }
  console.log('\n1. GREEN: проверяем исходную форму');
  if (run(['--reporter=verbose']).status !== 0) throw new Error('Исходные тесты уже падают. Остановка.');

  console.log('\n2. RED: временно удаляем disabled у кнопки');
  writeFileSync(source, original.replace(target, broken));
  const red = run(['--reporter=verbose', '--testNamePattern', filter]);
  if (red.status !== 1 || !red.stdout.includes('toBeDisabled')) {
    throw new Error('Ожидаемая ошибка блокировки не подтверждена.');
  }

  restore();
  console.log('\n3. GREEN: исходный файл восстановлен, запускаем весь набор');
  if (run(['--reporter=verbose']).status !== 0) throw new Error('После восстановления остался красный тест.');
  console.log('\nДемонстрация завершена. Исходный файл восстановлен.');
} catch (error) {
  restore();
  console.error(error.message);
  process.exitCode = 1;
}
