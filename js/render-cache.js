export const CACHE_LIMIT = 64 * 1024 * 1024;
// Leave 16 MiB for at most two StPageFlip temporary canvas copies.
const BITMAP_LIMIT = CACHE_LIMIT - 16 * 1024 * 1024;
export class PageCache {
  constructor(pdf, elements, size, onChange) {
    this.pdf = pdf; this.elements = elements; this.size = size; this.onChange = onChange;
    this.entries = new Map(); this.queue = []; this.running = 0; this.bytes = 0; this.closed = false; this.wanted = new Set(); this.visible = new Set();
  }
  request(visible, neighbors) {
    this.visible = new Set(visible); this.wanted = new Set([...visible, ...neighbors]);
    this.queue = [];
    for (const [index, entry] of this.entries) {
      if (!this.wanted.has(index)) { entry.task?.cancel(); if (entry.status !== 'rendering') this.release(index); }
    }
    for (const index of this.wanted) {
      const entry = this.entries.get(index);
      if (!entry) this.queue.push(index);
    }
    this.pump(); this.onChange();
  }
  release(index) {
    const entry = this.entries.get(index);
    if (!entry) return;
    this.bytes -= entry.bytes || 0;
    if (entry.canvas) { entry.canvas.width = 0; entry.canvas.height = 0; entry.canvas.remove(); }
    this.elements[index]?.querySelector('.page-message')?.remove();
    this.entries.delete(index);
  }
  ready(indices) { return indices.every(i => this.entries.get(i)?.status === 'ready'); }
  pump() {
    while (!this.closed && this.running < 2 && this.queue.length) {
      const index = this.queue.shift();
      if (!this.wanted.has(index) || this.entries.has(index)) continue;
      this.running++;
      this.render(index).finally(() => { this.running--; this.pump(); if (!this.closed) this.onChange(); });
    }
  }
  async render(index) {
    const entry = { status: 'rendering', bytes: 0 }; this.entries.set(index, entry);
    try {
      const page = await this.pdf.getPage(index + 1);
      if (this.closed || !this.wanted.has(index)) { this.release(index); return; }
      const natural = page.getViewport({ scale: 1 });
      // Contain each original page; cap one bitmap at 8 MiB so neighboring spreads fit.
      const scale = Math.min(this.size.width / natural.width, this.size.height / natural.height) * Math.min(devicePixelRatio || 1, 2);
      const capped = Math.min(scale, Math.sqrt((8 * 1024 * 1024 / 4) / (natural.width * natural.height)));
      const viewport = page.getViewport({ scale: capped });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width)); canvas.height = Math.max(1, Math.floor(viewport.height));
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `Trang PDF ${index + 1}`);
      entry.canvas = canvas; entry.bytes = canvas.width * canvas.height * 4;
      // Running allocations are included in the budget, not only completed bitmaps.
      while (this.bytes + entry.bytes > BITMAP_LIMIT) {
        const victim = [...this.entries].find(([i, e]) => i !== index && !this.visible.has(i) && e.status === 'ready');
        if (!victim) break;
        this.release(victim[0]);
      }
      this.bytes += entry.bytes;
      entry.task = page.render({ canvasContext: canvas.getContext('2d'), viewport });
      await entry.task.promise; entry.task = null;
      if (this.closed || !this.wanted.has(index)) { this.release(index); return; }
      this.elements[index].querySelector('.page-message')?.remove();
      this.elements[index].append(canvas); entry.status = 'ready';
    } catch (error) {
      if (this.closed || error.name === 'RenderingCancelledException' || !this.wanted.has(index)) {
        this.release(index);
        // A rapid A → B → A selection may want a task again after its cancellation.
        if (!this.closed && this.wanted.has(index)) this.queue.unshift(index);
        return;
      }
      if (entry.canvas) { this.bytes -= entry.bytes; entry.bytes = 0; entry.canvas.width = 0; entry.canvas.height = 0; }
      entry.status = 'error';
      const message = document.createElement('div'); message.className = 'page-message';
      message.textContent = `Không hiển thị được trang ${index + 1}. `;
      const retry = document.createElement('button'); retry.textContent = 'Thử lại';
      retry.onclick = () => { this.release(index); this.request([...this.visible], [...this.wanted]); };
      message.append(retry); this.elements[index].append(message);
    }
  }
  destroy() { this.closed = true; this.queue = []; for (const [index, entry] of this.entries) { entry.task?.cancel(); this.release(index); } }
}
