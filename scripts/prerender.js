// Post-build prerender: render the built SPA in a real headless browser and
// write the fully-rendered HTML back to dist/index.html. This lets crawlers and
// AI agents that don't execute JS read the entire resume, not just the meta tags.
//
// The content is fully static, so a single snapshot of "/" is all we need.
// On the client, Vue re-mounts and replaces the snapshot seamlessly.
import { preview } from 'vite'
import puppeteer from 'puppeteer'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve('dist/index.html')

const server = await preview({ preview: { port: 4180 } })
const url = server.resolvedUrls.local[0]
console.log(`[prerender] serving ${url}`)

const browser = await puppeteer.launch({ headless: true })
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
