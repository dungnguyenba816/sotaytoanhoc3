import { courses } from './courses.js';
import { ReadingStore } from './storage.js';
import { loadPDF } from './pdf.js';
import { Reader } from './reader.js';

const main = document.querySelector('main'), notice = document.querySelector('#notice');
const store = new ReadingStore(message => { notice.textContent = message; notice.hidden = false; });
const metadata = new Map(courses.map(course => [course.id, { state: 'loading' }]));
let reader, metadataController, routeVersion = 0;
const record = course => store.get(course.id, metadata.get(course.id)?.count);
const progress = course => Math.round(record(course)?.progress || 0);
const opened = () => courses.filter(course => record(course)).sort((a, b) => Date.parse(record(b).lastOpenedAt) - Date.parse(record(a).lastOpenedAt));
const countLabel = course => { const data = metadata.get(course.id); return data.state === 'ready' ? `${data.count} trang PDF` : data.state === 'loading' ? 'Đang kiểm tra số trang…' : 'Chưa đọc được thông tin PDF'; };
const link = course => `#reader/${course.id}`;
function courseCard(course) {
  const saved = record(course), data = metadata.get(course.id);
  return `<article class="course-card"><a href="${link(course)}" class="cover ${course.color}" tabindex="-1" aria-hidden="true"><img src="${course.cover}" alt="" width="600" height="380"><span class="format-badge">PDF GỐC</span></a><div class="course-info"><div class="eyebrow">TOÁN LỚP 3 <span>•</span> ${course.volume}</div><h3><a href="${link(course)}">${course.title}</a></h3><p>${course.description}</p><div class="book-meta"><span>▤ ${countLabel(course)}</span><span>Tham khảo giảng dạy</span></div><div class="progress-label"><span>${saved ? saved.lastPage === data.count ? 'Đã đến trang cuối' : `Đang đọc · Trang ${saved.lastPage}` : 'Chưa mở tài liệu'}</span><strong>${progress(course)}%</strong></div><progress max="100" value="${progress(course)}" aria-label="Vị trí đọc ${course.title}"></progress><a class="button ${saved ? 'primary' : 'secondary'}" href="${link(course)}">${saved ? 'Tiếp tục xem' : 'Mở tài liệu'} <span aria-hidden="true">↗</span></a>${data.state === 'error' ? `<div class="metadata-error"><span>Không mở được thông tin sách.</span> <button class="text-button" data-retry="${course.id}">Thử lại</button></div>` : ''}</div></article>`;
}
function recentList() {
  const list = opened();
  if (!list.length) return `<div class="empty-state"><span aria-hidden="true">▤</span><h3>Tài liệu sẵn sàng cho giờ dạy</h3><p>Cô hãy mở quyển sách trọn bộ để tham khảo khi soạn bài.<br>Trang xem gần nhất sẽ được lưu tại đây.</p><a class="text-link" href="#courses">Xem tài liệu giảng dạy →</a></div>`;
  return `<div class="recent-list">${list.map(course => `<a href="${link(course)}" class="recent-row"><img src="${course.cover}" alt="" width="94" height="66"><div><strong>${course.title}</strong><small>Trang ${record(course).lastPage} / ${metadata.get(course.id).count} · ${new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' }).format(new Date(record(course).lastOpenedAt))}</small></div><span aria-hidden="true">↗</span></a>`).join('')}</div>`;
}
function dashboard() {
  const complete = courses.filter(course => progress(course) === 100).length;
  const started = opened(); const totalKnown = courses.every(course => metadata.get(course.id).state === 'ready');
  const total = totalKnown ? courses.reduce((sum, course) => sum + metadata.get(course.id).count, 0) : null;
  main.innerHTML = `<section class="welcome-heading"><div><div class="eyebrow">ĐỒNG HÀNH CÙNG CÔ TRONG MỖI GIỜ DẠY</div><h1>Chào cô Lan Thúy <span class="hello" aria-hidden="true">✦</span></h1><p>Chúc cô một ngày giảng dạy hiệu quả. Tài liệu đã sẵn sàng để cô chuẩn bị bài.</p></div><span class="local-pill"><i></i> Không gian giảng dạy</span></section>
  <section class="welcome-banner"><div><span class="banner-tag">SỔ TAY TOÁN HỌC 3</span><h2>Chuẩn bị bài chu đáo,<br>truyền cảm hứng học toán.</h2><p>Tra cứu trọn bộ Sổ tay Toán học 3 trong một quyển.<br>Thuận tiện khi soạn bài và hướng dẫn học sinh trên lớp.</p><a class="button primary" href="${started[0] ? link(started[0]) : '#courses'}">${started[0] ? 'Xem tiếp tài liệu' : 'Mở thư viện tài liệu'} <span aria-hidden="true">→</span></a></div><div class="hero-art" aria-hidden="true"><span class="art-spark">✧</span><div class="art-circle"></div><img class="hero-pdf-cover" src="assets/covers/tron-bo.png" alt="" width="165" height="230"><span class="art-doodle">∑</span><span class="art-dot"></span></div></section>
  <section class="stats" aria-label="Thống kê đọc sách"><article><span class="stat-icon mint" aria-hidden="true">▤</span><div><strong>${courses.length} <small>quyển sách</small></strong><span>Trong thư viện giảng dạy</span></div></article><article><span class="stat-icon sand" aria-hidden="true">◷</span><div><strong>${started.length} <small>quyển đã mở</small></strong><span>Đã mở và có vị trí đọc</span></div></article><article><span class="stat-icon lavender" aria-hidden="true">✓</span><div><strong>${complete} <small>đã đến trang cuối</small></strong><span>${total !== null ? `${total} trang PDF trong thư viện` : 'Đang kiểm tra thông tin PDF'}</span></div></article></section>
  <section><div class="section-heading"><div><h2>Tài liệu giảng dạy <span class="count">01</span></h2><p>Một quyển trọn bộ để cô thuận tiện soạn bài và giảng dạy.</p></div><a class="text-link" href="#courses">Xem tất cả <span aria-hidden="true">→</span></a></div><div class="course-grid">${courses.map(courseCard).join('')}</div></section>
  <div class="lower-grid"><section class="recent-panel"><div class="section-heading"><h2>Tài liệu mở gần đây</h2><span class="subtle">TRÊN THIẾT BỊ NÀY</span></div>${recentList()}</section><aside class="reading-note"><span class="eyebrow">CÙNG CÔ CHUẨN BỊ GIỜ DẠY</span><span class="quote-mark" aria-hidden="true">“</span><blockquote>Chuẩn bị chu đáo,<br>giảng giải rõ ràng,<br>khơi gợi niềm vui học toán.</blockquote><p>Trang đang xem được lưu trên trình duyệt để cô thuận tiện quay lại khi chuẩn bị bài.</p><span aria-hidden="true">✦</span></aside></div>`;
}
function courseView() {
  main.innerHTML = `<section class="page-heading"><div class="eyebrow">THƯ VIỆN CỦA CÔ</div><h1>Tài liệu giảng dạy</h1><p>Tập 1 và Tập 2 đã được nối thành một quyển để cô tra cứu và sử dụng liền mạch trong giờ dạy.</p></section><div class="library-bar"><strong>Tất cả sách <span class="count">01</span></strong><span>PDF gốc · Đọc ngay trên thiết bị</span></div><section class="course-grid">${courses.map(courseCard).join('')}</section><section class="recent-panel library-recent"><div class="section-heading"><h2>Tiếp tục xem</h2></div>${recentList()}</section>`;
}
function about() {
  main.innerHTML = `<section class="page-heading"><div class="eyebrow">KHÔNG GIAN TÀI LIỆU DÀNH CHO GIÁO VIÊN</div><h1>Giới thiệu</h1><p>Hỗ trợ cô Lan Thúy chuẩn bị bài và giảng dạy Toán lớp 3.</p></section><article class="about-panel"><img src="assets/icon.svg" alt="" width="64" height="64"><h2>Sổ tay Toán học 3</h2><p>Thư viện tài liệu dành cho cô Lan Thúy, giúp cô tham khảo quyển PDF trọn bộ được gộp từ hai tập gốc khi soạn bài và giảng dạy. Cô có thể lật trang bằng chuột và mở lại đúng trang đang xem trên thiết bị này.</p><h3>Những trang sách được giữ nguyên</h3><p>Nội dung, công thức, hình vẽ và thứ tự trang đến trực tiếp từ hai tệp trong thư mục sách. Ảnh bìa được lấy trực tiếp từ trang đầu tiên của PDF trọn bộ.</p><h3>Thuận tiện khi chuẩn bị bài</h3><p>Vị trí đọc trong quyển trọn bộ được lưu trên trình duyệt. Phần trăm là vị trí trang hiện tại trong sách; quay về trang trước sẽ làm phần trăm giảm. Phần trăm này không thể hiện tiến độ giảng dạy hay kết quả học tập của học sinh.</p><h3>Đơn giản và cục bộ</h3><p>Không cần tài khoản hay kết nối mạng khi đã có đủ thư viện cục bộ. Dữ liệu đọc không được gửi lên máy chủ.</p><a class="button primary" href="#courses">Mở thư viện →</a></article>`;
}
async function readMetadata(course) {
  const state = { state: 'loading' }; metadata.set(course.id, state);
  try {
    const pdf = await loadPDF(course, metadataController.signal);
    metadata.set(course.id, { state: 'ready', count: pdf.numPages }); await pdf.destroy();
  } catch (error) { if (error.name !== 'AbortError') metadata.set(course.id, { state: 'error', message: error.message }); }
  if (!reader) renderDashboardRoute();
}
function renderDashboardRoute() {
  const route = location.hash.slice(1).split('/')[0];
  if (route === 'courses') courseView(); else if (route === 'about') about(); else dashboard();
}
function route() {
  routeVersion++; const version = routeVersion;
  reader?.destroy(); reader = null;
  const [name = 'dashboard', id] = location.hash.slice(1).split('/');
  const course = courses.find(item => item.id === id);
  const current = name === 'reader' && course ? 'reader' : ['courses', 'about'].includes(name) ? name : 'dashboard';
  document.body.classList.toggle('reading', current === 'reader');
  document.querySelectorAll('[data-nav]').forEach(item => { const selected = item.dataset.nav === (current === 'reader' ? 'courses' : current); item.classList.toggle('active', selected); if (selected) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current'); });
  document.querySelector('#breadcrumb').textContent = `Không gian giảng dạy / ${{ dashboard: 'Tổng quan', courses: 'Tài liệu giảng dạy', about: 'Giới thiệu', reader: 'Xem tài liệu' }[current]}`;
  document.querySelector('#menu').setAttribute('aria-expanded', 'false'); document.querySelector('.sidebar').classList.remove('expanded');
  document.title = (current === 'reader' ? course.title : { dashboard: 'Tổng quan', courses: 'Tài liệu giảng dạy', about: 'Giới thiệu' }[current]) + ' | Sổ tay Toán học 3';
  if (current === 'reader') {
    reader = new Reader(main, course, store, (courseId, count) => metadata.set(courseId, { state: 'ready', count }));
    reader.onRetry = () => { if (routeVersion === version) route(); }; reader.open();
  } else renderDashboardRoute();
  window.scrollTo(0, 0);
}
document.querySelector('#menu').addEventListener('click', event => { const button = event.currentTarget; const expanded = button.getAttribute('aria-expanded') !== 'true'; button.setAttribute('aria-expanded', String(expanded)); document.querySelector('.sidebar').classList.toggle('expanded', expanded); });
document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); main.focus(); });
main.addEventListener('click', event => { const button = event.target.closest('[data-retry]'); if (button) { button.disabled = true; readMetadata(courses.find(course => course.id === button.dataset.retry)); } });
window.addEventListener('hashchange', route);
window.addEventListener('pagehide', () => { reader?.destroy(); metadataController?.abort(); });
window.addEventListener('pageshow', event => { if (event.persisted) { metadataController = new AbortController(); route(); courses.forEach(readMetadata); } });
metadataController = new AbortController(); route(); courses.forEach(readMetadata);
if (location.protocol === 'file:') { notice.textContent = 'Hãy mở ứng dụng qua http://localhost:8000 sau khi chạy python3 -m http.server 8000. Trình duyệt không cho phép tải PDF và mô-đun qua file://.'; notice.hidden = false; }

document.querySelector('#sidebar-toggle').addEventListener('click', event => { const hidden = document.body.classList.toggle('sidebar-hidden'); event.currentTarget.setAttribute('aria-expanded', String(!hidden)); });
