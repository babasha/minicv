// Post-build prerender: render the built SPA in a real headless browser and
// write the fully-rendered HTML back to dist/index.html. This lets crawlers and
// AI agents that don't execute JS read the entire resume, not just the meta tags.
//
// The content is fully static, so a single snapshot of "/" is all we need.
// On the client, Vue re-mounts and replaces the snapshot seamlessly.
//
// Dual mode:
//   - Local builds use the full `puppeteer` (ships a Chromium for the host OS).
//   - Serverless builds (Vercel/CI) use `@sparticuz/chromium` + `puppeteer-core`,
//     because Vercel's build image lacks the system libs a stock Chromium needs.
import { preview } from 'vite'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve('dist/index.html')
const isServerless = !!(process.env.VERCEL || process.env.CI)

let puppeteer
let launchOptions
if (isServerless) {
  const chromium = (await import('@sparticuz/chromium')).default
  puppeteer = (await import('puppeteer-core')).default
  launchOptions = {
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  }
  console.log('[prerender] using @sparticuz/chromium (serverless)')
} else {
  puppeteer = (await import('puppeteer')).default
  launchOptions = { headless: true }
  console.log('[prerender] using local puppeteer')
}

const server = await preview({ preview: { port: 4180 } })
const url = server.resolvedUrls.local[0]
console.log(`[prerender] serving ${url}`)

const browser = await puppeteer.launch(launchOptions)
try {
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle0' })
  // Wait until Vue has mounted real content into #app.
  await page.waitForFunction(
    () => document.querySelector('#app')?.children.length > 0,
    { timeout: 30000 },
  )

  const html = await page.content()
  writeFileSync(OUT, html)
  console.log(`[prerender] wrote ${OUT} (${html.length} bytes)`)
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}
