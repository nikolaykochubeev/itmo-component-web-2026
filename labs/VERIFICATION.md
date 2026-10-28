# Проверка локального комплекта

Дата: 28 октября 2026.

## Docker

`cd labs/docker-fs && npm test`: **7 тестов, 7 passed, 0 failed**.

Проверены пустой корень, вложенные и пустые каталоги, файл нулевого размера, пробелы/скрытые имена/UTF-8, игнорирование ссылок и циклов, ошибки входного каталога, точная строка вывода, валидация ИСУ и размер больше `Number.MAX_SAFE_INTEGER`.

`npm run test:docker`: **4 сценария passed**, контейнер `linux/amd64`, `--network none`, readonly bind mount `/data`, `--read-only`:

```text
PASS Docker: empty → 307482-0-0-0
PASS Docker: only-directories → 307482-0-3-0
PASS Docker: mixed → 307482-4-3-850
PASS Docker: spaces-and-utf8 → 307482-3-0-15
PASS linux/amd64; read-only /data; network disabled; original ISU untouched
```

Команда настройки ИСУ отдельно проверена на временной копии: недопустимое значение отклонено без записи, шестизначная подпись принята. В рабочем проекте записан подтвержденный пользователем ИСУ **307482**.

Окончательный локальный образ также собран под именем `ghcr.io/nikolaykochubeev/itmo-component-lab:307482`; image ID `sha256:c06d33b533613f4e31d7ba0179146083976c3b5cf6c9f18b003bae90276fd7e1`, платформа `linux/amd64`. Отдельный запуск этого точного имени на новом readonly дереве без сети выдал ровно `307482-2-2-8\n`, stderr пуст, exit 0. Он сохранен в локальном Docker; сам по себе этот факт не означает публикацию в GHCR.

## Web Components

`cd labs/page-preview && CHROMIUM_EXECUTABLE_PATH=... npm test`: **7 тестов, 7 passed, 0 failed**, реальный установленный Chromium (Playwright cache build 1217). Импорт проверен через имя пакета, его `exports` и import map, с самостоятельной регистрацией элемента.

Сценарии: title и первый h1, entity/trim/внутренние пробелы, относительный URL, отдельные экземпляры, отсутствующая/пустая metadata, отсутствие src, HTTP/network error без uncaught exception, loading, быстрый переход slow→fast, отсоединение/возврат, безопасный текстовый вывод, удаление src.

`npm pack --dry-run --json`: **4 ожидаемых файла**, архив 5609 байт: LICENSE, README.md, package.json, src/page-preview.js. В пакет не попадают demo, тесты, node_modules и `.env`. Пакет остается `private: true` под временным именем; публикации в npmjs не было.

Демо запущено по HTTP, проверены `ready` для `example.html` и `error` для 404. Сохранен [скриншот](page-preview/demo-preview.png). Временный сервер после проверки завершен. Загрузка нового Chromium не понадобилась: тесты использовали уже установленный браузер. Для обычного нового окружения нужны `npm ci` и `npx playwright install chromium` из README.

Команда подготовки npm-имени отдельно проверена на временной копии manifest: не принимает unscoped имя, принимает синтаксически корректный scope и снимает `private` только в этой копии.

## Workflow и ограничения сдачи

`.github/workflows/publish-docker.yml` проверен YAML-парсером и `bash -n`; публикационный блок не выполнялся. Он требует ручного запуска в GitHub, использует `GITHUB_TOKEN` с `packages: write`, собирает `linux/amd64` и проверяет контейнер перед push.

Read-only состояние аккаунтов: GitHub login `nikolaykochubeev` доступен, у текущей gh-сессии не заявлен `write:packages`; `npm whoami` вернул `ENEEDAUTH`. ИСУ подтвержден пользователем. Для npmjs нужны создание аккаунта владельцем, его вход/2FA и принадлежащий ему scope. GitHub npm registry не заменяет явно указанный в PDF npmjs.

Наличие и публичность образа GHCR после публикации, npmjs-публикация и ответы в форумах Moodle проверяются отдельно. Форумы требуют членство в группе курса.
