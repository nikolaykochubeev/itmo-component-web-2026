const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host { display: block; color: #152a37; font: 16px/1.5 system-ui, sans-serif; }
    article { padding: 1.25rem; border: 1px solid #b7c9d3; border-radius: 12px; background: #f7fbfc; }
    a { display: inline-block; color: #075f76; font-weight: 650; overflow-wrap: anywhere; }
    dl { margin: .85rem 0 0; }
    dt { color: #455e6a; font-size: .8rem; }
    dd { margin: .1rem 0 .65rem; overflow-wrap: anywhere; }
    p { margin: .5rem 0 0; font-size: .85rem; color: #455e6a; }
    :host([data-status="error"]) article { border-color: #b76c48; }
  </style>
  <article aria-label="Предпросмотр страницы">
    <a part="link">Ссылка не задана</a>
    <dl>
      <dt>Название</dt><dd><span part="title">Название отсутствует</span></dd>
      <dt>Первый заголовок</dt><dd><span part="heading">Заголовок отсутствует</span></dd>
    </dl>
    <p role="status" aria-live="polite"></p>
  </article>`;

export class PagePreview extends HTMLElement {
  #controller = null;
  #generation = 0;
  #link;
  #title;
  #heading;
  #message;

  static get observedAttributes() { return ['src']; }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.append(template.content.cloneNode(true));
    this.#link = shadow.querySelector('[part="link"]');
    this.#title = shadow.querySelector('[part="title"]');
    this.#heading = shadow.querySelector('[part="heading"]');
    this.#message = shadow.querySelector('[role="status"]');
  }

  connectedCallback() { void this.#load(); }

  disconnectedCallback() {
    this.#generation += 1;
    this.#controller?.abort();
    this.#controller = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'src' && oldValue !== newValue && this.isConnected) void this.#load();
  }

  #isCurrent(generation) {
    return this.isConnected && generation === this.#generation;
  }

  #clear() {
    this.#title.textContent = 'Название отсутствует';
    this.#heading.textContent = 'Заголовок отсутствует';
    this.#link.removeAttribute('href');
    this.#link.textContent = 'Ссылка не задана';
  }

  async #load() {
    const generation = ++this.#generation;
    this.#controller?.abort();
    this.#controller = new AbortController();
    this.#clear();
    this.dataset.status = 'loading';
    this.#message.textContent = 'Загрузка…';

    try {
      const source = this.getAttribute('src')?.trim();
      if (!source) throw new Error('Укажите адрес страницы в атрибуте src.');
      const url = new URL(source, this.ownerDocument.baseURI);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Нужен HTTP или HTTPS адрес.');
      this.#link.href = url.href;
      this.#link.textContent = url.href;

      const response = await fetch(url.href, { signal: this.#controller.signal });
      if (!response.ok) throw new Error(`Страница ответила HTTP ${response.status}.`);
      const html = await response.text();
      if (!this.#isCurrent(generation)) return;

      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const title = parsed.title.trim();
      const heading = parsed.querySelector('h1')?.textContent.trim() ?? '';
      this.#title.textContent = title || 'Название отсутствует';
      this.#heading.textContent = heading || 'Заголовок отсутствует';
      this.#link.textContent = title || url.href;
      this.#message.textContent = 'Страница загружена';
      this.dataset.status = 'ready';
    } catch (error) {
      if (!this.#isCurrent(generation)) return;
      this.#message.textContent = error.message || 'Не удалось загрузить страницу.';
      this.dataset.status = 'error';
    }
  }
}

if (!customElements.get('page-preview')) customElements.define('page-preview', PagePreview);
