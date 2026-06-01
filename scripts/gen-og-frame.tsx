import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { StaticFrame } from '../app/api/og/StaticFrame';

async function main() {
  const fontPath = path.join(process.cwd(), 'public/fonts', 'Bungee-Regular.ttf');
  const font = await fs.readFile(fontPath);

  const res = new ImageResponse(<StaticFrame />, {
    width: 1200,
    height: 630,
    fonts: [{ name: 'Bungee', data: font.buffer as ArrayBuffer, weight: 400, style: 'normal' }],
  });

  const buf = Buffer.from(await res.arrayBuffer());
  const outDir = path.join(process.cwd(), 'public/og');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'frame.png'), buf);
  console.log(`Wrote public/og/frame.png (${buf.length} bytes)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
