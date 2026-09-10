// Optional asset maintenance, not part of the production build.
// Renders the existing social-card layout without ever writing a binary image.
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
try {
  const page = await browser.newPage({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1});
  await page.goto(new URL('./social-card.html', import.meta.url).href);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(image => image.decode()));
  });
  const bytes = await page.screenshot({type: 'png', animations: 'disabled'});
  await writeFile(fileURLToPath(new URL('./brand/social-v2.png.b64', import.meta.url)), bytes.toString('base64').match(/.{1,76}/g).join('\n') + '\n', 'ascii');
  console.log(`Social preview: 1200 × 630, ${bytes.length} bytes, saved only as Base64 text.`);
} finally {
  await browser.close();
}
