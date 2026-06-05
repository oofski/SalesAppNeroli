// Generates a branded app icon (build/icon.png + build/icon.ico) in pure Node —
// no ImageMagick required. A forest-green rounded tile with an Aveda-style sprig.
import zlib from 'zlib'
import { mkdirSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const SIZE = 256
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'build')
mkdirSync(OUT, { recursive: true })

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const DARK = hex('#2C3E35')
const MID = hex('#4A6741')
const TAN = hex('#8B7355')
const CREAM = hex('#E8EDE6')

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
// signed distance to a line segment
function sdSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1)
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r)
  const qy = Math.abs(py - cy) - (hh - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

function over(dst, src, a) {
  // simple source-over with src fully opaque, coverage a
  return [dst[0] + (src[0] - dst[0]) * a, dst[1] + (src[1] - dst[1]) * a, dst[2] + (src[2] - dst[2]) * a]
}

const px = Buffer.alloc(SIZE * SIZE * 4)
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const fx = x + 0.5
    const fy = y + 0.5
    let col = [0, 0, 0]
    let alpha = 0

    // rounded tile background
    const dRect = sdRoundRect(fx, fy, 128, 128, 120, 120, 52)
    const tile = smooth(1, -1, dRect)
    if (tile > 0) {
      // subtle vertical gradient on the tile
      const g = fy / SIZE
      const bg = [DARK[0] + 10 * (1 - g), DARK[1] + 14 * (1 - g), DARK[2] + 10 * (1 - g)]
      col = bg
      alpha = tile
    }

    // sprig: stem + leaves + dot, centered
    const stem = sdSeg(fx, fy, 128, 86, 128, 184) - 4.5
    col = over(col, TAN, smooth(1.2, -0.6, stem) * 0.95)

    const leaves = [
      [128, 150, 92, 122],
      [128, 134, 168, 108],
      [128, 116, 100, 96],
      [128, 102, 158, 84]
    ]
    for (const [ax, ay, bx, by] of leaves) {
      const d = sdSeg(fx, fy, ax, ay, bx, by) - 7
      col = over(col, MID, smooth(1.2, -1, d) * 0.97)
    }

    // top bud dot
    const dot = Math.hypot(fx - 128, fy - 80) - 9
    col = over(col, CREAM, smooth(1.2, -1, dot))

    const i = (y * SIZE + x) * 4
    px[i] = clamp(Math.round(col[0]), 0, 255)
    px[i + 1] = clamp(Math.round(col[1]), 0, 255)
    px[i + 2] = clamp(Math.round(col[2]), 0, 255)
    px[i + 3] = clamp(Math.round(alpha * 255), 0, 255)
  }
}

// ---- PNG encoder ----
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}
function encodePng(rgba, size) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  // add filter byte (0) per scanline
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const png = encodePng(px, SIZE)
writeFileSync(join(OUT, 'icon.png'), png)

// ---- ICO container wrapping a single 256x256 PNG ----
const dir = Buffer.alloc(6)
dir.writeUInt16LE(0, 0)
dir.writeUInt16LE(1, 2)
dir.writeUInt16LE(1, 4)
const entry = Buffer.alloc(16)
entry[0] = 0 // 256
entry[1] = 0 // 256
entry[2] = 0
entry[3] = 0
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bpp
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12) // offset = 6 + 16
writeFileSync(join(OUT, 'icon.ico'), Buffer.concat([dir, entry, png]))

console.log(`wrote build/icon.png and build/icon.ico (${SIZE}x${SIZE}, png ${png.length} bytes)`)
