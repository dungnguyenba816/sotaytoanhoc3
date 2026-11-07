export const STORAGE_KEY = 'sotaytoanhoc3.reading.v1';
export function normalizeRecord(record, totalPages) {
  if (!record || !Number.isInteger(record.lastPage) || record.lastPage < 1 || !Number.isInteger(totalPages) || totalPages < 1 || !Number.isFinite(Date.parse(record.lastOpenedAt))) return null;
  const lastPage = Math.min(record.lastPage, totalPages);
  return { lastPage, totalPages, progress: lastPage / totalPages * 100, lastOpenedAt: record.lastOpenedAt };
}
export class ReadingStore {
  constructor(notify, storageProvider = () => window.localStorage) {
    this.notify = notify; this.records = {}; this.storageProvider = storageProvider;
    try {
      this.storage = storageProvider();
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        for (const id of ['course_1', 'course_2']) if (parsed[id]) {
          const valid = normalizeRecord(parsed[id], parsed[id].totalPages);
          if (!valid) throw new Error();
          this.records[id] = valid;
        }
      }
    } catch { this.fallback('Không đọc được dữ liệu đã lưu. Vị trí đọc sẽ được giữ tạm trong phiên này.'); }
  }
  fallback(message) { this.storage = null; this.notify(message); }
  get(id, count) { return normalizeRecord(this.records[id], count); }
  save(id, page, count) {
    if (!['course_1', 'course_2'].includes(id) || !Number.isInteger(page) || page < 1 || page > count) return;
    this.records[id] = { lastPage: page, totalPages: count, progress: page / count * 100, lastOpenedAt: new Date().toISOString() };
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.records)); }
    catch { this.fallback('Trình duyệt không cho phép lưu dữ liệu. Vị trí đọc được giữ tạm và sẽ mất khi tải lại trang.'); }
  }
}
