import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const root = path.resolve(import.meta.dirname, '..')
const publicDir = path.join(root, 'public')
const icon = await readFile(path.join(publicDir, 'favicon.svg'), 'utf8')
const font = {
  loadSystemFonts: false,
  fontFiles: ['Regular', 'Medium', 'SemiBold'].map((weight) =>
    path.join(root, `node_modules/pretendard/dist/public/static/Pretendard-${weight}.otf`),
  ),
}
function render(svg, width) {
  return new Resvg(svg, { font, fitTo: { mode: 'width', value: width } }).render().asPng()
}

await mkdir(path.join(publicDir, 'icons'), { recursive: true })
for (const [file, size] of [
  ['apple-touch-icon.png', 180],
  ['icons/icon-192.png', 192],
  ['icons/icon-512.png', 512],
]) {
  await writeFile(path.join(publicDir, file), render(icon, size))
}

// ICO directory with PNG entries: crisp browser/bookmark icons at each native size.
const sizes = [16, 32, 48]
const images = sizes.map((size) => render(icon, size))
const header = Buffer.alloc(6 + sizes.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
sizes.forEach((size, index) => {
  const entry = 6 + index * 16
  header[entry] = size
  header[entry + 1] = size
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(images[index].length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += images[index].length
})
await writeFile(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ...images]))

const og = await readFile(path.join(publicDir, 'og/blueprint.svg'), 'utf8')
await writeFile(path.join(publicDir, 'og/blueprint.png'), render(og, 1200))
console.log('Generated favicon, bookmark icons, and 1200 × 630 Open Graph image.')
