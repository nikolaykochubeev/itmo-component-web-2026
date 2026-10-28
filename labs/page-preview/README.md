# page-preview

Браузерный веб-компонент `<page-preview>` получает HTML через `fetch`, извлекает `document.title` и первый `h1`, затем показывает ссылку и краткую карточку. Корневой импорт сам регистрирует элемент; дополнительный `register()` не требуется.

Пакет: [`@nikolay1010110101/page-preview`](https://www.npmjs.com/package/@nikolay1010110101/page-preview). Исходники: [GitHub](https://github.com/nikolaykochubeev/itmo-component-web-2026/tree/main/labs/page-preview). В браузере компонент работает без runtime-зависимостей и API-ключей.

## Импорт и интерфейс

Установите точную версию:

```sh
npm install @nikolay1010110101/page-preview@1.0.1
```

Импортируйте пакет в приложении со сборщиком или import map:

```js
import '@nikolay1010110101/page-preview';
```

```html
<page-preview src="/pages/example.html"></page-preview>
```

Bare import требует сборщик или import map. Локальная demo использует относительный путь к модулю, а не имя npm-пакета.

На обычной HTML-странице можно использовать зафиксированную CDN-версию:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@nikolay1010110101/page-preview@1.0.1/src/page-preview.js"></script>
<page-preview src="./example.html"></page-preview>
```

| Интерфейс | Поведение |
| --- | --- |
| `src` | URL HTML-страницы; относительный адрес разрешается через `document.baseURI` страницы с компонентом |
| `data-status` | `loading` до запроса, `ready` после отображения, `error` при отсутствующем src, HTTP или сетевой ошибке |
| `shadowRoot` | Открытый Shadow DOM, отдельный клон настоящего `<template>` для каждого экземпляра |
| `a[part="link"]` | Настоящая видимая ссылка на разрешенный URL, текст — название или URL |
| `span[part="title"]` | Название документа с `trim()` либо `Название отсутствует` |
| `span[part="heading"]` | `textContent.trim()` первого `h1` либо `Заголовок отсутствует` |

При смене src прежний fetch отменяется; номер поколения и `isConnected` дополнительно исключают запись устаревшего результата. Удаление отменяет запрос, повторное подключение запускает загрузку заново. Полученный HTML разбирается `DOMParser` в отдельном документе. Название и заголовок записываются через `textContent`, а не `innerHTML`. Поддерживаются HTTP/HTTPS адреса.

Для внешнего сайта нужны его CORS-заголовки. Режим `no-cors` не позволяет прочитать HTML. Учебные и тестовые страницы доступны на том же origin. CDN, API-ключи и runtime npm-зависимости не нужны.

## Локальная демонстрация и тесты

```sh
cd labs/page-preview
npm ci
npx playwright install chromium
npm test
npm run demo
```

Откройте http://127.0.0.1:8000/demo/ . Первый компонент успешно загружается; второй демонстрирует ошибку 404. Кнопки меняют src, показывают отсутствие метаданных и безопасный вывод текста, похожего на HTML. Через `file://` модули и fetch проверять не следует.

Тесты запускают реальный Chromium и временный HTTP-сервер с контролируемыми HTML-страницами. Проверяются самостоятельная регистрация, один начальный fetch при upgrade элемента из HTML, относительные URL, title/первый h1, HTML-сущности и внутренние пробелы, fallback, ошибки, loading, гонка запросов, независимость экземпляров, удаление/возврат и отсутствие вставленного HTML. Сервер использует только loopback. Если Chromium уже установлен в другом месте, тест поддерживает `CHROMIUM_EXECUTABLE_PATH=/полный/путь/к/chromium npm test`.

## Выпуск новой версии

Публиковать пакет может владелец npm-аккаунта `nikolay1010110101` или добавленный им maintainer. Проверьте `npm whoami`, затем повысьте версию и выполните проверки:

```sh
npm version patch --no-git-tag-version
npm test
npm pack --dry-run
npm publish --access public
```

В архив входят `src`, README, LICENSE и manifest; demo, тесты, `.env` и node_modules не включаются. При запросе 2FA подтверждение выполняет владелец аккаунта. После публикации проверьте точную версию через `npm view`. Одну комбинацию имени и версии npm повторно не принимает.

## Сдача

Для версии 1.0.1 строка ответа:

```text
@nikolay1010110101/page-preview@1.0.1
```

Также приложите [ссылку на исходники и README](https://github.com/nikolaykochubeev/itmo-component-web-2026/tree/main/labs/page-preview). Форум: https://node-server.ru/m/mod/forum/view.php?id=4226 . Для отправки нужен доступ к группе курса.

Исходные [условия работы в Moodle](https://node-server.ru/m/pluginfile.php/16568/mod_forum/intro/page-preview-lab.pdf) включают критерии на 100 баллов. Их локальная копия сохранена в репозитории курса в `labs/instructions/`. Лицензия реализации — MIT, текст находится в LICENSE.

## Изменения 1.0.1

При регистрации компонента, уже присутствующего в HTML, начальная загрузка запускается один раз. Изменения src после подключения продолжают загружать новую страницу. Сценарий upgrade из разметки покрыт отдельным regression test.
