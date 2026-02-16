import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build'])
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.css', '.sql'])

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (!IGNORE_DIRS.has(entry)) walk(full, files)
      continue
    }
    files.push(full)
  }
  return files
}

function isTextFile(path) {
  const idx = path.lastIndexOf('.')
  const ext = idx >= 0 ? path.slice(idx) : ''
  return TEXT_EXTS.has(ext)
}

const markerRegex = /^(<<<<<<<|=======|>>>>>>>) /m
const offenders = []

for (const file of walk(ROOT)) {
  if (!isTextFile(file)) continue
  const content = readFileSync(file, 'utf8')
  if (markerRegex.test(content)) offenders.push(file.replace(`${ROOT}/`, ''))
}

if (offenders.length > 0) {
  console.error('Merge conflict markers found in these files:')
  for (const f of offenders) console.error(` - ${f}`)
  process.exit(1)
}

console.log('No merge conflict markers detected.')
