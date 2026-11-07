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
    for (let i = 0; i < 4; i++) await frame.getByRole('button', { name: 'Phóng to', exact: true }).click();
    await frame.locator('.reader-status').waitFor({ state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(500);
    await frame.locator('.reader-scroll').evaluate(el => { el.scrollLeft = 0; });
    const viewport = await frame.locator('.reader-scroll').boundingBox();
    const pageBeforePan = await frame.locator('#page-number').inputValue();
    const outerScroll = () => page.evaluate(() => document.scrollingElement.scrollTop + [...document.querySelectorAll('*')].filter(el => el !== document.scrollingElement && el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)).reduce((sum, el) => sum + el.scrollTop, 0));
    const previousScroll = await outerScroll();
    const x = viewport.x + viewport.width * .6, y = viewport.y + 160;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x - 120, y - 60, { steps: 12 }); await page.mouse.up();
    if (await frame.locator('.reader-scroll').evaluate(el => el.scrollLeft) < 100) throw new Error('Embedded book did not pan horizontally');
    if (await outerScroll() < previousScroll + 40) {
      console.log(JSON.stringify(await frame.locator('.reader-scroll').evaluate(el => {
        const rows = [];
        while (el?.ownerDocument) {
          const doc = el.ownerDocument;
          for (let node = el; node; node = node.parentElement) rows.push({ tag: node.tagName, id: node.dataset?.testid || node.className, top: node.scrollTop, height: node.scrollHeight, client: node.clientHeight, overflow: doc.defaultView.getComputedStyle(node).overflowY });
          try { el = doc.defaultView.frameElement; } catch { break; }
        }
        return rows;
      }), null, 2));
      throw new Error('Embedded drag did not scroll the parent page vertically');
    }
    if (await frame.locator('#page-number').inputValue() !== pageBeforePan) throw new Error('Embedded panning flipped a page');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(1500);
    if (await iframe.evaluate(el => el.contentDocument.documentElement.scrollWidth > el.clientWidth)) throw new Error('Embedded mobile layout overflows');
    console.log('Đạt: Streamlit tải giao diện, tự điều chỉnh chiều cao, vẽ PDF/worker, lật trang, phóng to, kéo sách ngang/dọc và bố cục điện thoại.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
