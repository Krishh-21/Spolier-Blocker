const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const tasks = [
  // Icons (root) — manifest expects these filenames
  { in: 'assets/icon-shield.svg', out: 'icon128.png', w: 128, h: 128 },
  { in: 'assets/icon-shield.svg', out: 'icon48.png', w: 48, h: 48 },
  { in: 'assets/icon-shield.svg', out: 'icon16.png', w: 16, h: 16 },

  // Badge
  { in: 'assets/badge.svg', out: 'assets/badge-512.png', w: 512, h: 512 },

  // Onboarding / store screenshots
  { in: 'assets/welcome-hero.svg', out: 'assets/welcome-hero-1920x720.png', w: 1920, h: 720 },
  { in: 'assets/store-hero.svg', out: 'assets/store-hero-1280x800.png', w: 1280, h: 800 },
  { in: 'assets/popup-mockup.svg', out: 'assets/popup-360x600.png', w: 360, h: 600 },
  { in: 'assets/options-mockup.svg', out: 'assets/options-1280x800.png', w: 1280, h: 800 }
];

async function run() {
  ensureDir(path.join(__dirname, '..', 'assets'));

  const ops = tasks.map(t => {
    const input = path.join(__dirname, '..', t.in);
    const output = path.join(__dirname, '..', t.out);

    return sharp(input)
      .resize(t.w, t.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 90 })
      .toFile(output)
      .then(() => console.log(`Wrote ${output}`))
      .catch(err => console.error(`Failed ${output}:`, err.message));
  });

  await Promise.all(ops);
  console.log('All conversions complete');
}

run().catch(e => { console.error(e); process.exit(1); });
