import { courses } from './courses.js';
import { ReadingStore } from './storage.js';
import { Reader } from './reader.js';

const main = document.querySelector('main');
const notice = document.querySelector('#notice');
const course = courses[0];
const store = new ReadingStore(message => { notice.textContent = message; notice.hidden = false; });
let reader;

function openBook() {
  const hash = '#reader/' + course.id;
  if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);
  if (reader && !reader.closed) return;
  document.title = course.title;
  document.body.classList.add('reading', 'reader-only');
  reader = new Reader(main, course, store, () => {});
  reader.onRetry = openBook;
  reader.open();
}

document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); main.focus(); });
window.addEventListener('hashchange', openBook);
window.addEventListener('pagehide', () => reader?.destroy());
window.addEventListener('pageshow', event => { if (event.persisted) openBook(); });
openBook();
