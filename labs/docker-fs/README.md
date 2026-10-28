# Компонент анализа файловой системы

Приложение анализирует `/data` средствами `node:fs/promises`. В stdout попадает ровно одна строка:

```text
307482-FILES-DIRECTORIES-SIZE
```

ИСУ `307482` подтвержден владельцем работы. При переносе проекта другому студенту подпись меняется до сборки:

```sh
npm run configure -- ВАШ_ШЕСТИЗНАЧНЫЙ_ИСУ
```

Неизвестный или некорректный ИСУ отклоняется. Во время запуска контейнера аргументы и переменные окружения не требуются.

## Правила подсчета

- Корневой `/data` не входит в число каталогов; все вложенные каталоги, включая пустые, входят.
- Считаются только обычные файлы; размер — число байтов, включая нулевые файлы.
- Символические ссылки, в том числе битые и образующие циклы, пропускаются через `lstat`.
- Обход итеративный, поэтому глубина каталогов не расходует стек JavaScript. Сумма размеров хранится как `BigInt`.
- Вход не изменяется. При ошибке stdout пуст, сообщение попадает в stderr, процесс завершается с кодом 1.

## Сборка и запуск

Нужны Node.js 22+ и работающий Docker. Зависимостей npm у приложения нет.

```sh
cd /Users/nikolai/Projects/itmo-study/course-48/labs/docker-fs
npm test
docker build --platform linux/amd64 -t ghcr.io/nikolaykochubeev/itmo-component-lab:307482 .
mkdir -p test-data/docs test-data/empty
printf abc > test-data/a.txt
printf 12345 > test-data/docs/b.txt
docker run --rm --platform linux/amd64 --network none \
  --mount "type=bind,source=$(pwd)/test-data,target=/data,readonly" \
  ghcr.io/nikolaykochubeev/itmo-component-lab:307482
```

На новом дереве из этого примера ожидается `307482-2-2-8`. Не используйте уже заполненный `test-data`, если сравниваете с этим значением.

Расширенная проверка черного ящика:

```sh
npm run test:docker
```

Она собирает временную копию проекта для `linux/amd64`, проверяет пустой корень, только каталоги, смешанное дерево с symlink и имена с пробелами/UTF-8. Для каждого запуска запрещена сеть, `/data` и файловая система контейнера доступны только для чтения. Тестовая подпись взята из примера PDF и совпадает с подтвержденным ИСУ; конфигурация проекта не перезаписывается.

## Публикация через GitHub Actions

В корне репозитория курса подготовлен `.github/workflows/publish-docker.yml`. Запуск manual workflow `Publish Docker laboratory` проверяет модуль, собирает `linux/amd64`, выполняет smoke test и публикует:

```text
ghcr.io/nikolaykochubeev/itmo-component-lab:307482
```

Workflow использует встроенный `GITHUB_TOKEN` с разрешением `packages: write`, поэтому личный PAT в исходники не нужен. Он работает после загрузки репозитория на GitHub; локальная подготовка workflow его не запускает.

После успешной публикации владелец должен открыть пакет `itmo-component-lab` в GitHub → Packages → Package settings и установить требуемую PDF видимость **Public**. Затем проверить скачивание без своей учетной записи, используя отдельную временную конфигурацию Docker:

```sh
anonymous_docker_config="$(mktemp -d)"
docker --config "$anonymous_docker_config" pull --platform linux/amd64 ghcr.io/nikolaykochubeev/itmo-component-lab:307482
rm -rf "$anonymous_docker_config"
docker image inspect --format '{{.Os}}/{{.Architecture}}' ghcr.io/nikolaykochubeev/itmo-component-lab:307482
```

Для сдачи в Moodle отправляется **полное имя образа**, без URL репозитория и без `latest`. Образ должен существовать, скачиваться публично, а ИСУ в теге и stdout должны совпадать. Форум сдачи: https://node-server.ru/m/mod/forum/view.php?id=3918 . Сейчас аккаунту требуется доступ к группе курса.

## Почему это компонент

Контейнер скрывает реализацию за контрактом `/data → stdout`. Проверятор подставляет неизвестный каталог и проверяет результат, не зная имен функций и структуры исходников. Внутри компонент `node:fs` предоставляет API файловой системы; снаружи Docker задает отдельную границу приложения.

Источники: исходные [условия Docker](../instructions/lab_docker_fs_component.pdf) и [инструкция GHCR](../instructions/instrukciya_GHCR_docker_lab.pdf).
