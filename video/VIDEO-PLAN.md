# Demo Video — Alter Ego

**Target:** 90s | **Live URL:** https://alter-ego-wine-mu.vercel.app
**Audio:** Native (live narration during recording)

---

## Recording Command

```bash
# Record screen + system audio for 90 seconds
ffmpeg -y -f avfoundation -i "1:0" -r 30 -t 95 \
  -vf "scale=1920:1080" -pix_fmt yuv420p \
  -c:v libx264 -crf 23 video/demo-raw.mp4

# OR: Record a specific window on macOS
# Use QuickTime Player → File → New Screen Recording
# Select the browser window showing the live URL
```

## Manual Recording Steps

1. Open https://alter-ego-wine-mu.vercel.app in Chrome
2. Set browser to 1280×800, zoom 100%
3. Hide bookmarks bar, extensions, DevTools
4. Start screen recording
5. Follow DEMO-SCRIPT.md sequence (7 steps, 90 seconds)
6. Stop recording
7. Trim to exactly 90s

## If using Playwright automation

```bash
cd /Users/MAC/hackathon-toolkit/active/alter-ego
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto('https://alter-ego-wine-mu.vercel.app');
  await page.waitForTimeout(2000);
  await page.click('button:has-text(\"LOAD DEMO\")');
  await page.waitForTimeout(1000);
  await page.click('button:has-text(\"ANALYZE\")');
  // Auto-plays through all 6 phases (~76 seconds)
  await page.waitForTimeout(80000);
  await browser.close();
})();
"
```

## Post-Processing

```bash
# Trim to exactly 90s
ffmpeg -i video/demo-raw.mp4 -t 90 -c copy video/demo-final.mp4

# Add hackathon outro card
# Title: "Alter Ego — Built for OKX.AI Genesis"
# URL: alter-ego-wine-mu.vercel.app | GitHub: github.com/dmustapha/alter-ego
```
