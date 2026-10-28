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

`cd labs/page-preview && CHROMIUM_EXECUTABLE_PATH=... npm test`: **8 тестов, 8 passed, 0 failed**, реальный установленный Chromium (Playwright cache build 1217). Импорт проверен через имя пакета, его `exports` и import map, с самостоятельной регистрацией элемента. Regression test воспроизвёл два начальных fetch при upgrade элемента из существующего HTML; версия 1.0.1 выполняет ровно один запрос.

Сценарии: title и первый h1, entity/trim/внутренние пробелы, относительный URL, отдельные экземпляры, отсутствующая/пустая metadata, отсутствие src, HTTP/network error без uncaught exception, loading, быстрый переход slow→fast, отсоединение/возврат, безопасный текстовый вывод, удаление src.

Проверенный архив версии 1.0.1: **4 ожидаемых файла**, 5513 байт: LICENSE, README.md, package.json, src/page-preview.js. В пакет не попадают demo, тесты, node_modules и `.env`.

Опубликован `@nikolay1010110101/page-preview@1.0.1`. Registry tarball совпал с проверенным архивом: `sha512-k9Wlx8EH1mnUJqiL9K/x5MnI2ytPxhWGSKB0fngeptO5YBTBMwCn0H1I9QQ3WcICJajo7MelVrY+2BsaKUVz3Q==`. Свежая установка exact version успешна. CDN-модуль побайтно совпал с исходником. Проверены и installed import, и настоящий CDN late import: элемент из HTML upgraded на месте, ровно один fetch/HTTP-запрос, `ready`, корректные title/h1/link, без page errors. Версия 1.0.0 не изменена; сдавать следует исправленную 1.0.1.

Демо запущено по HTTP, проверены `ready` для `example.html` и `error` для 404. Сохранен [скриншот](page-preview/demo-preview.png). Временный сервер после проверки завершен. Загрузка нового Chromium не понадобилась: тесты использовали уже установленный браузер. Для обычного нового окружения нужны `npm ci` и `npx playwright install chromium` из README.

Команда подготовки npm-имени отдельно проверена на временной копии manifest: не принимает unscoped имя, принимает синтаксически корректный scope и снимает `private` только в этой копии.

## Workflow и ограничения сдачи

`.github/workflows/publish-docker.yml` проверен YAML-парсером и `bash -n`. Затем выполнен [GitHub Actions run 40611625286](https://github.com/nikolaykochubeev/itmo-component-web-2026/actions/runs/40611625286), результат `success`. Он использует `GITHUB_TOKEN` с `packages: write`, собирает `linux/amd64` и проверяет контейнер перед push. Опубликован точный тег `ghcr.io/nikolaykochubeev/itmo-component-lab:307482`, digest `sha256:c8a96cad085bbd4e0e9622d4e3a6c50722fa02efc03b813dce211f7162a228c9`.

После разрешения владельца в настройках GitHub включён Public. Повторная проверка использовала пустой временный `DOCKER_CONFIG`, без credential helpers, с явным адресом Docker daemon. Анонимный `docker pull --platform linux/amd64` завершился с exit 0, digest совпал с указанным выше. Скачанный образ запущен по digest на временном дереве с readonly `/data`, `--read-only` и `--network none`: stdout ровно `307482-2-2-8\n`, stderr пуст, exit 0. Временные файлы и контейнер очищены.

Публикация GHCR выполняется через `GITHUB_TOKEN` workflow. Для npmjs нужны аккаунт владельца, его вход/2FA и принадлежащий ему scope. GitHub npm registry не заменяет явно указанный в PDF npmjs.

Публикации GHCR и npmjs проверены. Ответы в форумах Moodle пока отправить нельзя: аккаунт не включён в группу курса.
