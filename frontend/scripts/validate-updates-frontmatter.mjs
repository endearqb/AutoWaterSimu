import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8")
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkDir(full))
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      files.push(full)
    }
  }
  return files
}

function checkFrontmatter(raw) {
  const hasStart = raw.startsWith("---")
  const fmEndMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/m)
  const hasEnd = Boolean(fmEndMatch)
  const parsed = matter(raw)
  const data = parsed.data || {}
  const fields = {
    title: Boolean(data.title),
    publishedAt: Boolean(data.publishedAt),
    summary: Boolean(data.summary || data.excerpt),
    tag: Boolean(data.tag),
  }
  const hasDate = Boolean(data.date)
  const dateValue = data.date || null
  const tagSuggest =
    data.tag === "updates"
      ? "Updates"
      : data.tag === "release"
        ? "Release"
        : data.tag || null
  return { hasStart, hasEnd, data, fields, hasDate, dateValue, tagSuggest }
}

function main() {
  const root = process.cwd()
  const updatesDir = path.join(root, "src", "data", "updates")
  if (!fs.existsSync(updatesDir)) {
    console.error("Updates directory not found:", updatesDir)
    process.exit(1)
  }

  const files = walkDir(updatesDir)
  let okCount = 0
  let warnCount = 0
  let failCount = 0

  console.log("Frontmatter compliance report for /src/data/updates (MDX)\n")
  for (const file of files) {
    const raw = readFile(file)
    const res = checkFrontmatter(raw)
    const issues = []
    if (!res.hasStart || !res.hasEnd) {
      issues.push("frontmatter not properly closed with ---")
    }
    if (!res.fields.title) issues.push("missing title")
    if (!res.fields.publishedAt) {
      if (res.hasDate) {
        issues.push(`missing publishedAt (found date=${res.dateValue})`)
      } else {
        issues.push("missing publishedAt")
      }
    }
    if (!res.fields.summary) issues.push("missing summary")
    if (!res.fields.tag) issues.push("missing tag")

    const status =
      issues.length === 0 ? "OK" : res.hasStart && res.hasEnd ? "WARN" : "FAIL"
    if (status === "OK") okCount++
    else if (status === "WARN") warnCount++
    else failCount++

    console.log(`- ${path.basename(file)}: ${status}`)
    if (issues.length) {
      console.log(`  issues: ${issues.join("; ")}`)
    }
    if (res.tagSuggest && res.data.tag !== res.tagSuggest) {
      console.log(`  suggestion: normalize tag -> ${res.tagSuggest}`)
    }
  }

  console.log("\nSummary:")
  console.log(`  OK:   ${okCount}`)
  console.log(`  WARN: ${warnCount}`)
  console.log(`  FAIL: ${failCount}`)
}

main()
