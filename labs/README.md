# Лабораторные — Компонентное веб-программирование 2026

| Работа | Проект | Результат для сдачи |
| --- | --- | --- |
| Node.js + `node:fs` + Docker | [docker-fs](docker-fs/README.md) | `ghcr.io/nikolaykochubeev/itmo-component-lab:307482` |
| Web Components | [page-preview](page-preview/README.md) | `@nikolay1010110101/page-preview@1.0.1`, плюс ссылка на репозиторий |

ИСУ **307482** записан в Docker-проекте. Имя образа соответствует обязательному шаблону GHCR. Образ опубликован публично; анонимное скачивание и запуск по digest проверены.

Web Component опубликован в [npmjs.com](https://www.npmjs.com/package/@nikolay1010110101/page-preview). Точная версия 1.0.1 проверена свежей установкой и импортом опубликованного CDN-модуля. API-ключи этим двум лабораторным не нужны.

Локальные копии инструкций курса и извлечённый текст находятся в рабочей папке `labs/instructions/` и не включены в публикуемый код. Ответы опубликованы в группе ALnew_2026: [Docker](https://node-server.ru/m/mod/forum/discuss.php?d=2629) и [Web Components](https://node-server.ru/m/mod/forum/discuss.php?d=2630). Оценки пока не выставлены.

## Проверки

В каждом проекте выполните `npm test`. Docker-проект использует только встроенные средства Node.js и не требует `npm install`. Для браузерных тестов page-preview сначала выполните `npm ci` и `npx playwright install chromium`.

Дополнительная проверка контейнера: `npm run test:docker` из `docker-fs`. Она создает временный образ, запускает четыре независимых дерева `/data`, проверяет точный stdout, `linux/amd64`, отсутствие сети и readonly mount, после чего удаляет свой образ и тестовые файлы. Настройка ИСУ проекта сохраняется.
