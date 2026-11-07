let library;
export async function pdfLibrary() {
  if (!library) library = import('../vendor/pdfjs/pdf.mjs').then(pdf => {
    pdf.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
    return pdf;
  }).catch(error => { library = null; throw new Error('Chưa tải được thư viện PDF cục bộ. Hãy chạy python3 scripts/vendor.py rồi thử lại.', { cause: error }); });
  return library;
}
export async function loadPDF(course, signal) {
  const pdf = await pdfLibrary();
  if (signal?.aborted) throw new DOMException('Đã hủy', 'AbortError');
  const task = pdf.getDocument({ url: new URL('../' + course.file, import.meta.url).href,
    cMapUrl: new URL('../vendor/pdfjs/cmaps/', import.meta.url).href, cMapPacked: true,
    standardFontDataUrl: new URL('../vendor/pdfjs/standard_fonts/', import.meta.url).href,
    isEvalSupported: false });
  const abort = () => { task.destroy().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try { return await task.promise; }
  catch (error) {
    if (signal?.aborted) throw new DOMException('Đã hủy', 'AbortError');
    throw new Error(error.name === 'InvalidPDFException' ? 'Tệp PDF không hợp lệ hoặc đã hỏng.' : 'Không mở được PDF. Hãy kiểm tra tệp trong thư mục books và thử lại.', { cause: error });
  } finally { signal?.removeEventListener('abort', abort); }
}
