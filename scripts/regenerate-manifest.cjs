#!/usr/bin/env node
// Recompute SHA512/size in release/latest-mac.yml after we post-process the
// DMG (sign + notarize + staple changes its bytes, and electron-builder's
// generated manifest still references the pre-processed hash).

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const yaml = require('js-yaml')

const releaseDir = path.resolve(__dirname, '..', 'release')
const manifestPath = path.join(releaseDir, 'latest-mac.yml')

if (!fs.existsSync(manifestPath)) {
  console.error(`[manifest] not found: ${manifestPath}`)
  process.exit(1)
}

const manifest = yaml.load(fs.readFileSync(manifestPath, 'utf8'))

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath)
  return {
    sha512: crypto.createHash('sha512').update(buf).digest('base64'),
    size: buf.length
  }
}

for (const entry of manifest.files || []) {
  const filePath = path.join(releaseDir, entry.url)
  if (!fs.existsSync(filePath)) {
    console.warn(`[manifest] skipping missing file: ${entry.url}`)
    continue
  }
  const { sha512, size } = hashFile(filePath)
  if (entry.sha512 !== sha512 || entry.size !== size) {
    console.log(`[manifest] updating ${entry.url} (size ${entry.size} -> ${size})`)
    entry.sha512 = sha512
    entry.size = size
  }
}

if (manifest.path) {
  const filePath = path.join(releaseDir, manifest.path)
  if (fs.existsSync(filePath)) {
    const { sha512 } = hashFile(filePath)
    manifest.sha512 = sha512
  }
}

fs.writeFileSync(
  manifestPath,
  yaml.dump(manifest, { lineWidth: -1, noRefs: true, sortKeys: false })
)
console.log(`[manifest] wrote ${manifestPath}`)
