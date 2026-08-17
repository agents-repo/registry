#!/usr/bin/env node
/**
 * Build, preview, and drift-check Marp decks under docs/slides/.
 *
 * Usage:
 *   node scripts/slides.mjs build
 *   node scripts/slides.mjs preview
 *   node scripts/slides.mjs check
 */
/* eslint-disable security/detect-non-literal-fs-filename -- deck paths are repo-relative stems from docs/slides readdir */
import { createHash } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marp } from '@marp-team/marp-core'
import { marpCli } from '@marp-team/marp-cli'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const slidesDir = path.join(root, 'docs', 'slides')
const themeDir = path.join(slidesDir, 'theme')
const themeCssPath = path.join(themeDir, 'theme.css')
const pdfDir = path.join(slidesDir, 'pdf')
const buildDir = path.join(slidesDir, 'build')
const minPdfBytes = 1024
const pdfMagic = Buffer.from('%PDF-')

const command = process.argv[2]

if (!['build', 'preview', 'check'].includes(command)) {
  console.error('Usage: node scripts/slides.mjs <build|preview|check>')
  process.exit(2)
}

async function listDecks() {
  const entries = await fs.readdir(slidesDir)
  return entries
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort()
    .map((name) => ({
      stem: name.slice(0, -'.md'.length),
      source: path.join(slidesDir, name)
    }))
}

async function requireDecks() {
  const decks = await listDecks()
  if (decks.length === 0) {
    throw new Error(`No Marp decks found in ${slidesDir}`)
  }
  return decks
}

function chromeCandidates() {
  return [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
  ].filter(Boolean)
}

async function resolveBrowserPath() {
  for (const candidate of chromeCandidates()) {
    try {
      const stats = await fs.stat(candidate)
      if (!stats.isFile()) {
        continue
      }
      await fs.access(candidate, fsConstants.X_OK)
      return candidate
    } catch {
      // try next
    }
  }
  return undefined
}

async function fingerprintDeck(sourcePath, themeCss) {
  const markdown = await fs.readFile(sourcePath, 'utf8')
  const marp = new Marp({ html: true })
  marp.themeSet.add(themeCss)
  const { html, css } = marp.render(markdown)
  return createHash('sha256').update(html).update('\n').update(css).digest('hex')
}

function hashPath(stem) {
  return path.join(pdfDir, `${stem}.src.sha256`)
}

async function runMarp(args) {
  const exitCode = await marpCli(args)
  if (exitCode !== 0) {
    throw new Error(`marp-cli exited with code ${exitCode}`)
  }
}

/**
 * Chrome needs --no-sandbox on GitHub-hosted Ubuntu runners. Marp CLI reads
 * CHROME_NO_SANDBOX. Auto-disable the sandbox only in CI. Local Linux keeps
 * the sandbox unless the caller exports CHROME_NO_SANDBOX=1. Leave an explicit
 * empty value untouched.
 */
function ensureChromeNoSandbox() {
  if (process.env.CHROME_NO_SANDBOX !== undefined) {
    return
  }
  if (process.env.CI) {
    process.env.CHROME_NO_SANDBOX = '1'
  }
}

async function convertDeck(deck, outputPath, extraArgs) {
  ensureChromeNoSandbox()
  const browserPath = await resolveBrowserPath()
  const args = [
    deck.source,
    '--allow-local-files',
    '--theme-set',
    themeDir,
    '--output',
    outputPath,
    ...extraArgs
  ]
  if (browserPath) {
    args.push('--browser-path', browserPath)
  }
  await runMarp(args)
}

async function assertPdfArtifact(filePath, stem, label, failures) {
  try {
    const handle = await fs.open(filePath, 'r')
    try {
      const stat = await handle.stat()
      if (stat.size < minPdfBytes) {
        failures.push(`${stem}: ${label} PDF is too small (${stat.size} bytes)`)
        return
      }
      const header = Buffer.alloc(pdfMagic.length)
      const { bytesRead } = await handle.read(header, 0, header.length, 0)
      if (bytesRead < pdfMagic.length || !header.equals(pdfMagic)) {
        failures.push(
          `${stem}: ${label} file is not a PDF (missing %PDF- header)`
        )
      }
    } finally {
      await handle.close()
    }
  } catch {
    failures.push(`${stem}: missing ${path.relative(root, filePath)}`)
  }
}

async function checkSourceFingerprint(deck, themeCss, failures) {
  const digest = await fingerprintDeck(deck.source, themeCss)
  const fingerprintFile = hashPath(deck.stem)
  try {
    const recorded = (await fs.readFile(fingerprintFile, 'utf8')).trim()
    if (recorded !== digest) {
      failures.push(
        `${deck.stem}: source drifted from committed PDF fingerprint (run npm run slides:build)`
      )
    }
  } catch {
    failures.push(
      `${deck.stem}: missing source fingerprint ${path.relative(root, fingerprintFile)}`
    )
  }
}

async function rebuildPdfsOrRecordMissingChrome(decks, failures) {
  const browserPath = await resolveBrowserPath()
  if (!browserPath) {
    failures.push(
      'Chromium/Chrome not found. Set PUPPETEER_EXECUTABLE_PATH or CHROME_PATH, or install Chrome.'
    )
    return
  }
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agents-repo-slides-check-'))
  try {
    for (const deck of decks) {
      const tmpPdf = path.join(tmpDir, `${deck.stem}.pdf`)
      try {
        await convertDeck(deck, tmpPdf, ['--pdf'])
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        failures.push(`${deck.stem}: rebuild failed (${detail})`)
        continue
      }
      await assertPdfArtifact(tmpPdf, deck.stem, 'rebuilt', failures)
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true })
  }
}

async function buildPdfs() {
  const decks = await requireDecks()
  const themeCss = await fs.readFile(themeCssPath, 'utf8')
  await fs.mkdir(pdfDir, { recursive: true })
  for (const deck of decks) {
    const pdfPath = path.join(pdfDir, `${deck.stem}.pdf`)
    await convertDeck(deck, pdfPath, ['--pdf'])
    const digest = await fingerprintDeck(deck.source, themeCss)
    await fs.writeFile(hashPath(deck.stem), `${digest}\n`, 'utf8')
    console.log(`Wrote ${path.relative(root, pdfPath)}`)
  }
}

async function previewHtml() {
  const decks = await requireDecks()
  await fs.mkdir(buildDir, { recursive: true })
  for (const deck of decks) {
    const htmlPath = path.join(buildDir, `${deck.stem}.html`)
    await convertDeck(deck, htmlPath, ['--html'])
    console.log(`Wrote ${path.relative(root, htmlPath)}`)
  }
}

async function checkDecks() {
  const decks = await requireDecks()
  const themeCss = await fs.readFile(themeCssPath, 'utf8')
  const failures = []

  for (const deck of decks) {
    await assertPdfArtifact(
      path.join(pdfDir, `${deck.stem}.pdf`),
      deck.stem,
      'committed',
      failures
    )
    await checkSourceFingerprint(deck, themeCss, failures)
  }

  try {
    await rebuildPdfsOrRecordMissingChrome(decks, failures)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    failures.push(`slides rebuild aborted: ${detail}`)
  }

  if (failures.length > 0) {
    console.error(failures.join('\n'))
    process.exit(1)
  }
  console.log(`slides:check passed for ${decks.length} deck(s)`)
}

try {
  if (command === 'build') {
    await buildPdfs()
  } else if (command === 'preview') {
    await previewHtml()
  } else {
    await checkDecks()
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
