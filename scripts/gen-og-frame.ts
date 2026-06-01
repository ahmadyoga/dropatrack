/**
 * Captures the static OG frame from the design HTML using puppeteer.
 * Dynamic text is blanked (invisible) so only chrome remains.
 * Run: npx tsx scripts/gen-og-frame.ts
 */
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs/promises';

const HTML_PATH = path.join(process.cwd(), 'design/og-image-v2.html');
const OUT_PATH  = path.join(process.cwd(), 'public/og/frame.png');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`file://${HTML_PATH}`, { waitUntil: 'networkidle2', timeout: 15000 });

  // Blank all dynamic text so only chrome remains.
  // Use visibility:hidden to preserve layout height.
  // Inline JS string avoids tsx transform injecting __name into serialized fn
  await page.evaluate(`(function(){
    var sels=['.nowtag .trk','.nowtag .art','.roomname','.metarow','.statgrid .big','.urlpill .u'];
    sels.forEach(function(s){
      document.querySelectorAll(s).forEach(function(el){ el.style.visibility='hidden'; });
    });
  })()`);

  const ogEl = await page.$('.og');
  if (!ogEl) throw new Error('Could not find .og element');

  const buf = await ogEl.screenshot({ type: 'png' });
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, buf);
  console.log(`Wrote ${OUT_PATH} (${(buf as Buffer).length} bytes)`);

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
