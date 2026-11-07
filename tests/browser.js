import { runCoreTests } from './core.test.js';
import { loadPDF } from '../js/pdf.js';
import { courses } from '../js/courses.js';
import { PageCache, CACHE_LIMIT } from '../js/render-cache.js';
import { Reader } from '../js/reader.js';
import { ReadingStore } from '../js/storage.js';
const output = document.querySelector('#results');
const log = text => { output.textContent += text + '\n'; };
const wait = async predicate => { for (let i = 0; i < 1500; i++) { if (predicate()) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw new Error('Quá thời gian chờ'); };
document.querySelector('#run').onclick = async event => {
  event.target.disabled = true; output.textContent = '';
  try {
    log(`Đạt ${runCoreTests()} kiểm tra logic, lưu trữ và con trỏ.`);
    for (const course of courses) {
      const pdf = await loadPDF(course); log(`${course.title}: ${pdf.numPages} trang (PDF.js).`);
      const canvas = document.createElement('canvas');
      try {
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i), viewport = page.getViewport({ scale: .5 });
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          log(`  Trang ${i}: vẽ thành công (${canvas.width} × ${canvas.height}).`);
          page.cleanup();
        }
      } finally { canvas.width = canvas.height = 0; await pdf.destroy(); }
    }
    let running = 0, maxRunning = 0;
    const elements = Array.from({ length: 16 }, () => document.createElement('div'));
    const fakePDF = { getPage: async () => ({ getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }), render: () => {
      running++; maxRunning = Math.max(maxRunning, running); let cancel;
      const promise = new Promise((resolve, reject) => { const timer = setTimeout(() => { running--; resolve(); }, 30); cancel = () => { clearTimeout(timer); running--; reject(Object.assign(new Error('Hủy'), { name: 'RenderingCancelledException' })); }; });
      return { promise, cancel };
    } }) };
    const cache = new PageCache(fakePDF, elements, { width: 2000, height: 2600 }, () => { if (cache.bytes > CACHE_LIMIT) throw new Error('Vượt ngân sách canvas'); });
    try {
      cache.request([0, 1], [2, 3, 4, 5]); await wait(() => cache.ready([0, 1]) && cache.running === 0);
      cache.request([14, 15], [10, 11, 12, 13]); await wait(() => cache.ready([14, 15]) && cache.running === 0);
      if (maxRunning > 2 || cache.entries.has(0) || cache.bytes > CACHE_LIMIT) throw new Error('Sai giới hạn hàng đợi hoặc giải phóng cache');
      log('Đạt: hai tác vụ đồng thời, ngân sách canvas, giải phóng trang xa và điều hướng nhanh.');
      cache.request([0, 1], []);
      await new Promise(resolve => setTimeout(resolve, 1));
      cache.request([8, 9], []); cache.request([0, 1], []);
      await wait(() => cache.ready([0, 1]) && cache.running === 0);
      log('Đạt: chọn nhanh A → B → A không mất tác vụ vẽ.');
    } finally { cache.destroy(); }
    const fixture = document.querySelector('#fixture'); fixture.hidden = false;
    const db = new Map(), store = new ReadingStore(log, () => ({ getItem: key => db.get(key) ?? null, setItem: (key, value) => db.set(key, value) }));
    let reader;
    try {
      reader = new Reader(fixture, courses[0], store, () => {}); await reader.open();
      await wait(() => reader.ready);
      reader.select(reader.pdf.numPages); await wait(() => reader.ready);
      if (store.get(courses[0].id, reader.pdf.numPages).progress !== 100) throw new Error('Không lưu đúng trang cuối');
      reader.select(2); await wait(() => reader.ready);
      reader.zoom = 1.25; reader.layout(); await wait(() => reader.ready);
      if (reader.active !== 2) throw new Error('Phóng to làm mất trang được chọn');
      reader.root.querySelector('#page-slider').value = 1;
      reader.root.querySelector('#page-slider').dispatchEvent(new Event('change', { bubbles: true }));
      await wait(() => reader.ready);
      if (reader.active !== 1) throw new Error('Thanh chọn trang không hoạt động');
      reader.root.querySelector('#page-number').focus();
      reader.root.querySelector('#page-number').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      if (reader.active !== 1) throw new Error('Phím tắt chiếm focus ô nhập');
      for (const type of ['pointerdown', 'pointermove', 'pointerup']) reader.book.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', clientX: 150, clientY: 150, bubbles: true }));
      if (reader.active !== 1) throw new Error('Con trỏ cảm ứng làm lật trang');
      reader.root.querySelector('[data-action="next"]').click();
      await wait(() => reader.active > 1 && reader.ready);
      reader.root.querySelector('[data-action="prev"]').click();
      await wait(() => reader.active === 1 && reader.ready);
      reader.select(2); await wait(() => reader.ready);
      reader.destroy();
      reader = new Reader(fixture, courses[1], store, () => {}); await reader.open(); await wait(() => reader.ready);
      if (reader.active !== 1) throw new Error('Vị trí hai tập bị trộn');
      reader.select(Math.min(3, reader.pdf.numPages)); await wait(() => reader.ready); reader.destroy();
      reader = new Reader(fixture, courses[0], store, () => {}); await reader.open(); await wait(() => reader.ready);
      if (reader.active !== 2) throw new Error('Mở lại không giữ trang đã chọn');
      log('Đạt: điều khiển lật tới/lùi, phóng to, thanh chọn trang, focus bàn phím, con trỏ cảm ứng và khôi phục độc lập hai tập.');
      reader.destroy();
      reader = new Reader(fixture, { ...courses[0], file: 'tests/khong-ton-tai.pdf' }, store, () => {});
      await reader.open();
      if (!fixture.querySelector('.reader-status.error button')) throw new Error('PDF thiếu không có nút thử lại');
      log('Đạt: PDF thiếu có thông báo và nút thử lại.');
    } finally { reader?.destroy(); fixture.replaceChildren(); fixture.hidden = true; }
    log('Hoàn tất kiểm tra tự động. Kiểm tra hiệu ứng, bố cục và toàn màn hình theo README.');
  } catch (error) { log('KHÔNG ĐẠT: ' + error.message); console.error(error); }
  finally { event.target.disabled = false; }
};
