import { loadPDF } from './pdf.js';
import { PageCache } from './render-cache.js';
import { attachMouse } from './mouse.js';
import { flipLifecycle, preserveCanvasCopies } from './flip-lifecycle.js';

export function spreadIndices(leading, count, columns) {
  const start = columns === 1 ? leading : Math.floor(leading / 2) * 2;
  return Array.from({ length: Math.min(columns, count - start) }, (_, i) => start + i);
}
export function spreadActive(indices, count) { return indices.includes(count - 1) ? count : indices[0] + 1; }

export class Reader {
  constructor(root, course, store, onMetadata) {
    this.root = root; this.course = course; this.store = store; this.onMetadata = onMetadata;
    this.abort = new AbortController(); this.zoom = 1; this.active = 1; this.closed = false; this.ready = false;
  }
  async open() {
    this.root.innerHTML = `<section class="reader"><div class="reader-heading"><a href="#dashboard">← Về tổng quan</a><span>TÀI LIỆU GIẢNG DẠY</span></div><h1></h1><div class="reader-status" role="status">Đang mở sách gốc…</div><div class="reader-controls" hidden><button data-action="prev" aria-label="Trang trước">← Trước</button><label>Trang <input id="page-number" type="number" min="1" aria-label="Chọn trang PDF"></label><span id="page-total"></span><button data-action="next" aria-label="Trang sau">Sau →</button><div class="zoom-controls"><button data-action="out" aria-label="Thu nhỏ">−</button><output id="zoom-value">100%</output><button data-action="in" aria-label="Phóng to">+</button></div><button data-action="fullscreen" hidden>⛶ Toàn màn hình</button><label id="outline-label" hidden>Mục lục <select id="outline"><option value="">Đến mục…</option></select></label></div><div class="reader-scroll" tabindex="0" aria-label="Nội dung sách; dùng nút Trước và Sau để lật trang" hidden><div class="book-stage"></div></div><div class="reader-bottom" hidden><input id="page-slider" type="range" min="1" value="1" aria-label="Thanh chọn trang PDF"><p id="reading-position"></p><small>Dùng chuột ở góc nhỏ để lật trang · Kéo giữa sách để di chuyển trong khung khi phóng to · Cảm ứng: dùng nút hoặc thanh chọn trang.</small></div></section>`;
    this.root.querySelector('h1').textContent = this.course.title;
    try {
      this.pdf = await loadPDF(this.course, this.abort.signal);
      if (this.closed) { await this.pdf.destroy(); return; }
      this.onMetadata(this.course.id, this.pdf.numPages);
      const module = await import('../vendor/page-flip/page-flip.module.mjs').catch(error => { throw new Error('Chưa tải được thư viện lật trang. Hãy chạy python3 scripts/vendor.py rồi thử lại.', { cause: error }); });
      if (this.closed) return;
      this.PageFlip = module.PageFlip;
      const first = await this.pdf.getPage(1);
      if (this.closed) return;
      const viewport = first.getViewport({ scale: 1 }); this.ratio = viewport.width / viewport.height;
      this.active = this.store.get(this.course.id, this.pdf.numPages)?.lastPage || 1;
      for (const selector of ['.reader-controls', '.reader-scroll', '.reader-bottom']) this.root.querySelector(selector).hidden = false;
      this.bind(); this.layout(true); this.loadOutline();
    } catch (error) {
      if (this.closed) return;
      const status = this.root.querySelector('.reader-status'); status.classList.add('error'); status.textContent = error.message;
      const retry = document.createElement('button'); retry.textContent = 'Thử mở lại';
      retry.onclick = () => { this.destroy(); this.onRetry?.(); };
      const original = document.createElement('a'); original.href = this.course.file; original.textContent = 'Mở PDF gốc'; original.target = '_blank'; original.rel = 'noopener';
      status.append(document.createElement('br'), retry, ' ', original);
    }
  }
  bind() {
    const signal = this.abort.signal;
    this.root.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'prev') this.navigate(-1);
      if (action === 'next') this.navigate(1);
      if (action === 'out' || action === 'in') {
        this.zoom = Math.max(1, Math.min(2.5, this.zoom + (action === 'in' ? .25 : -.25))); this.layout();
      }
      if (action === 'fullscreen') this.fullscreen();
    }, { signal });
    this.root.querySelector('#page-number').addEventListener('change', event => this.select(Number(event.target.value)), { signal });
    const slider = this.root.querySelector('#page-slider');
    slider.addEventListener('input', event => { this.root.querySelector('#reading-position').textContent = `Đến trang ${event.target.value} / ${this.pdf.numPages}`; }, { signal });
    slider.addEventListener('change', event => this.select(Number(event.target.value)), { signal });
    this.root.querySelector('#outline').addEventListener('change', event => { if (event.target.value) this.select(Number(event.target.value)); }, { signal });
    document.addEventListener('keydown', event => {
      if (event.target.isContentEditable || event.target.closest('input,button,select,textarea,a,[contenteditable]:not([contenteditable="false"]),[role="slider"]') || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft') this.navigate(-1);
      else if (event.key === 'ArrowRight') this.navigate(1);
      else if (event.key === 'Home') this.select(1);
      else if (event.key === 'End') this.select(this.pdf.numPages);
      else if (event.key === 'Escape') { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else location.hash = '#dashboard'; }
      else return;
      event.preventDefault();
    }, { signal });
    this.resize = new ResizeObserver(() => {
      const width = this.root.clientWidth;
      if (width === this.lastWidth) return;
      clearTimeout(this.resizeTimer); this.resizeTimer = setTimeout(() => this.layout(), 120);
    }); this.resize.observe(this.root);
    document.addEventListener('fullscreenchange', () => this.layout(), { signal });
    this.root.querySelector('[data-action="fullscreen"]').hidden = !document.fullscreenEnabled;
  }
  async fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await this.root.querySelector('.reader').requestFullscreen(); }
    catch { this.status('Không thể bật toàn màn hình trong trình duyệt này.'); }
  }
  layout(initial = false) {
    if (this.closed) return;
    this.lastWidth = this.root.clientWidth; this.ready = false; this.suppress = true;
    const viewport = this.root.querySelector('.reader-scroll');
    viewport.classList.toggle('is-zoomed', this.zoom > 1);
    if (this.zoom === 1) { viewport.scrollLeft = 0; viewport.scrollTop = 0; }
    const saved = this.active, width = Math.max(180, viewport.getBoundingClientRect().width - 38);
    this.columns = width >= 700 ? 2 : 1;
    const baseHeight = Math.min(680, Math.max(280, innerHeight - 310), width / this.columns / this.ratio);
    // Keep enlarged pages inside a bounded viewport; panning never scrolls the app.
    viewport.style.height = this.zoom > 1 ? Math.max(330, Math.ceil(baseHeight) + 38) + 'px' : '';
    this.pageHeight = Math.round(baseHeight * this.zoom); this.pageWidth = Math.round(this.pageHeight * this.ratio);
    if (initial) {
      const stage = this.root.querySelector('.book-stage'); this.book = document.createElement('div'); this.book.className = 'flip-book'; stage.append(this.book);
      this.pages = Array.from({ length: this.pdf.numPages }, (_, i) => {
        const page = document.createElement('div'); page.className = 'pdf-page'; page.dataset.page = i + 1;
        const holder = document.createElement('div'); holder.className = 'page-content'; holder.setAttribute('aria-label', `Trang ${i + 1}`); page.append(holder); return page;
      });
      this.book.style.width = this.pageWidth * this.columns + 'px'; this.book.style.height = this.pageHeight + 'px';
      this.flip = new this.PageFlip(this.book, { width: this.pageWidth, height: this.pageHeight, size: 'fixed', autoSize: false, startPage: saved - 1, usePortrait: true, showCover: false, drawShadow: true, maxShadowOpacity: .28, flippingTime: 650, useMouseEvents: false, mobileScrollSupport: true, showPageCorners: true, disableFlipByClick: true });
      this.flip.on('changeState', event => {
        if (event.data === 'flipping' || event.data === 'user_fold') this.turning = true;
        if (event.data === 'read') this.turning = false;
      });
      this.flip.on('flip', event => { if (!this.suppress && this.turning) { this.active = spreadActive(spreadIndices(event.data, this.pdf.numPages, this.columns), this.pdf.numPages); this.refresh(); } });
      this.stopFrames = flipLifecycle(() => this.flip.loadFromHTML(this.pages));
      preserveCanvasCopies(this.flip);
      this.detachMouse = attachMouse(this.book, this.flip, () => this.ready && ['read', 'fold_corner', 'user_fold'].includes(this.flip.getState()), { viewport, canPan: () => this.zoom > 1 });
    } else {
      this.flip.getRender().finishAnimation();
      const settings = this.flip.getSettings(); settings.width = this.pageWidth; settings.height = this.pageHeight;
      this.book.style.width = this.pageWidth * this.columns + 'px'; this.book.style.height = this.pageHeight + 'px';
      this.book.style.minWidth = this.pageWidth + 'px'; this.book.style.minHeight = this.pageHeight + 'px';
      this.flip.update();
    }
    this.cache?.destroy();
    this.cache = new PageCache(this.pdf, this.pages.map(page => page.querySelector('.page-content')), { width: this.pageWidth, height: this.pageHeight }, () => this.displayed());
    this.flip.turnToPage(saved - 1); this.active = saved; this.suppress = false; this.refresh();
  }
  refresh() {
    if (this.closed) return;
    const count = this.pdf.numPages;
    this.visible = spreadIndices(this.flip.getCurrentPageIndex(), count, this.columns);
    const neighbors = [];
    for (let spread = -2; spread <= 2; spread++) for (const index of spreadIndices(this.visible[0] + spread * this.columns, count, this.columns)) if (index >= 0 && index < count) neighbors.push(index);
    this.ready = false; this.status('Đang hiển thị các trang PDF…');
    this.cache.request(this.visible, neighbors);
    this.updateControls();
  }
  displayed() {
    if (this.closed || !this.visible) return;
    if (this.cache.ready(this.visible)) {
      this.ready = true; this.status(''); this.store.save(this.course.id, this.active, this.pdf.numPages);
    } else {
      const failed = this.visible.some(i => this.cache.entries.get(i)?.status === 'error');
      this.status(failed ? 'Một trang chưa hiển thị được. Chọn “Thử lại” trên trang để tiếp tục.' : 'Đang hiển thị các trang PDF…');
    }
  }
  status(message) { const node = this.root.querySelector('.reader-status'); node.textContent = message; node.hidden = !message; }
  updateControls() {
    const count = this.pdf.numPages;
    for (const id of ['page-number', 'page-slider']) { const node = this.root.querySelector('#' + id); node.max = count; node.value = this.active; }
    this.root.querySelector('#page-total').textContent = `/ ${count}`;
    this.root.querySelector('#zoom-value').textContent = Math.round(this.zoom * 100) + '%';
    this.root.querySelector('[data-action="prev"]').disabled = this.visible[0] === 0;
    this.root.querySelector('[data-action="next"]').disabled = this.visible.includes(count - 1);
    this.root.querySelector('[data-action="out"]').disabled = this.zoom <= 1;
    this.root.querySelector('[data-action="in"]').disabled = this.zoom >= 2.5;
    this.root.querySelector('#reading-position').textContent = `Trang ${this.active} / ${count} · Vị trí đọc ${Math.round(this.active / count * 100)}%`;
  }
  navigate(direction) {
    if (!this.ready || !this.flip || !['read', 'fold_corner'].includes(this.flip.getState())) return;
    if ((direction < 0 && this.visible[0] === 0) || (direction > 0 && this.visible.includes(this.pdf.numPages - 1))) return;
    this.explicit = null;
    if (direction > 0) this.flip.flipNext('bottom'); else this.flip.flipPrev('bottom');
  }
  select(page) {
    if (!Number.isInteger(page) || page < 1 || page > this.pdf.numPages) { this.updateControls(); return; }
    this.suppress = true; this.flip.getRender().finishAnimation(); this.flip.turnToPage(page - 1); this.suppress = false;
    this.active = page; this.explicit = null; this.refresh();
  }
  async loadOutline() {
    try {
      const outline = await this.pdf.getOutline(); const options = [];
      const visit = async (items, depth = 0) => {
        for (const item of items || []) {
          try {
            const dest = typeof item.dest === 'string' ? await this.pdf.getDestination(item.dest) : item.dest;
            if (Array.isArray(dest) && dest.length) {
              const index = Number.isInteger(dest[0]) ? dest[0] : await this.pdf.getPageIndex(dest[0]);
              if (index >= 0 && index < this.pdf.numPages) options.push({ title: '— '.repeat(Math.min(depth, 3)) + item.title, page: index + 1 });
            }
          } catch { /* Unresolvable outlines do not become invented chapters. */ }
          await visit(item.items, depth + 1);
        }
      };
      await visit(outline); if (this.closed || !options.length) return;
      const select = this.root.querySelector('#outline');
      for (const item of options) select.add(new Option(item.title, String(item.page)));
      this.root.querySelector('#outline-label').hidden = false;
    } catch { /* No table of contents when a document has none. */ }
  }
  destroy() {
    this.closed = true; this.abort.abort(); clearTimeout(this.resizeTimer); this.resize?.disconnect();
    this.detachMouse?.(); this.stopFrames?.(); this.cache?.destroy(); this.flip?.destroy();
    this.pdf?.destroy().catch(() => {});
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
}
