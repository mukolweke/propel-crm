/**
 * Fetch Stitch project screens (images + HTML).
 * Requires STITCH_API_KEY environment variable.
 *
 * Usage: npx tsx scripts/fetch-stitch-assets.ts
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { stitch } from '@google/stitch-sdk'

const PROJECT_ID = '10933418778808578168'

const SCREENS = [
  { name: 'design-system', id: 'asset-stub-assets_51aea1afdb624e10b92d58a2593ef155' },
  { name: 'login', id: '99acf76b28d3470ca7184f453883abcb' },
  { name: 'dashboard', id: 'b4a9f5cb7cee4423ab83ce57422be471' },
  { name: 'contacts', id: 'c74d1531598146988cdee766f884156c' },
  { name: 'log-activity', id: 'c1b66f13dd2743c2b0c8569cbf7398dd' },
  { name: 'add-contact', id: 'e6947def03d946a3ac14bdbf1b5f4130' },
  { name: 'reports', id: '9d7adc3af8ee491192f6e9fb12021a8e' },
  { name: 'sharing-privacy', id: '383b40878df548a784ff1d0031d798dd' },
  { name: 'settings', id: '66fd4a4ca9f0440689ce93af340baacf' },
]

const OUT_DIR = join(process.cwd(), '.stitch', 'designs')

async function download(url: string, dest: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await writeFile(dest, buf)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const project = stitch.project(PROJECT_ID)

  for (const screen of SCREENS) {
    console.log(`Fetching ${screen.name}...`)
    const s = await project.getScreen(screen.id)
    const htmlUrl = await s.getHtml()
    const imageUrl = await s.getImage()

    await download(htmlUrl, join(OUT_DIR, `${screen.name}.html`))
    await download(imageUrl, join(OUT_DIR, `${screen.name}.png`))
    console.log(`  ✓ ${screen.name}`)
  }

  console.log(`\nAssets saved to ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
