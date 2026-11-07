const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || process.argv[2] || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || process.argv[3] || undefined });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(process.env.STREAMLIT_TEST_URL || process.argv[4] || 'http://127.0.0.1:8511');
    const iframe = page.locator('iframe[title*="ebook_library"]');
    await iframe.waitFor({ timeout: 60000 });
    const frame = await iframe.contentFrame();
    await frame.getByRole('heading', { name: 'Chào cô Lan Thúy' }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(1500);
    const height = (await iframe.boundingBox()).height;
    if (height < 400) throw new Error('Streamlit component did not report its height');
    await frame.getByRole('link', { name: 'Sổ tay Toán học 3 - Tập 1', exact: true }).click();
    await frame.locator('.reader-status').waitFor({ state: 'hidden', timeout: 30000 });
    await frame.getByRole('button', { name: 'Trang sau', exact: true }).click();
    await frame.locator('#page-number').evaluate(el => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { clearInterval(interval); reject(new Error('Page did not turn')); }, 10000);
      const interval = setInterval(() => { if (Number(el.value) > 1) { clearTimeout(timeout); clearInterval(interval); resolve(); } }, 50);
    }));
    await frame.getByRole('button', { name: 'Phóng to', exact: true }).click();
    if (await frame.locator('.reader-scroll').evaluate(el => getComputedStyle(el).overflowX !== 'auto')) throw new Error('Zoom scrolling disabled');
    await frame.getByRole('button', { name: 'Thu nhỏ', exact: true }).click();
    if (await frame.locator('.reader-scroll').evaluate(el => getComputedStyle(el).overflowX !== 'hidden')) throw new Error('Scrollbar enabled at 100%');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);
    if (await iframe.evaluate(el => el.contentDocument.documentElement.scrollWidth > el.clientWidth)) throw new Error('Embedded mobile layout overflows');
    console.log('Đạt: Streamlit tải giao diện, tự điều chỉnh chiều cao, vẽ PDF/worker, lật trang, phóng to và bố cục điện thoại.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
