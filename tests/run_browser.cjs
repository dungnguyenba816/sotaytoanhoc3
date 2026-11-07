// Optional: PLAYWRIGHT_PACKAGE may point to an existing Playwright installation.
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || process.argv[2] || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const server = http.createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || process.argv[3] || undefined });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(base + '/tests/browser.html');
    await page.getByRole('button', { name: 'Chạy kiểm tra', exact: true }).click();
    await page.waitForFunction(() => /Hoàn tất kiểm tra tự động|KHÔNG ĐẠT/.test(document.querySelector('#results').textContent), undefined, { timeout: 180000 });
    const results = await page.locator('#results').innerText();
    console.log(results);
    if (results.includes('KHÔNG ĐẠT')) throw new Error('Browser integration tests failed');
    await page.goto(base);
    await page.getByRole('heading', { name: 'Chào cô Lan Thúy' }).waitFor();
    await page.goto(base + '/#about');
    if ((await page.locator('main').innerText()).includes('ảnh đại diện')) throw new Error('Removed About copy is still visible');
    await page.goto(base + '/#reader/course_1');
    await page.locator('.reader-status').waitFor({ state: 'hidden', timeout: 30000 });
    const book = await page.locator('.flip-book').boundingBox();
    await page.mouse.move(book.x + book.width - 3, book.y + 3);
    await page.waitForTimeout(700);
    if (await page.locator('.reader-scroll').evaluate(el => getComputedStyle(el).overflowX !== 'hidden')) throw new Error('Scrollbar enabled at 100%');
    await page.getByRole('button', { name: 'Phóng to', exact: true }).click();
    if (await page.locator('.reader-scroll').evaluate(el => getComputedStyle(el).overflowX !== 'auto')) throw new Error('Scrolling disabled above 100%');
    await page.getByRole('button', { name: 'Thu nhỏ', exact: true }).click();
    if (await page.locator('.reader-scroll').evaluate(el => getComputedStyle(el).overflowX !== 'hidden' || el.scrollLeft !== 0)) throw new Error('Scrolling not reset at 100%');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile document overflows horizontally');
    console.log('Đạt: giao diện giáo viên, nội dung giới thiệu, thanh cuộn theo mức phóng và bố cục điện thoại.');
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
