/* Генерация PDF-конспектов модулей: каждая страница модуля печатается
 * Chromium'ом (print CSS темы Material), затем склеивается pypdf'ом
 * (tools/merge_pdfs.py). Требует запущенный локальный сервер сайта.
 *
 * Использование: node make_module_pdfs.mjs <playwright_dir> <base_url> <out_dir>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const [playwrightDir, baseUrl, outDir] = process.argv.slice(2);
const { chromium } = await import(path.join(playwrightDir, "node_modules", "playwright", "index.mjs"));

const DOCS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "docs", "modules");
const MODULES = [...Array(6).keys()].map(i => `a${i + 1}`)
  .concat([...Array(15).keys()].map(i => `p${i + 1}`));

// страницы модуля в дидактическом порядке
function modulePages(code) {
  const d = path.join(DOCS, code);
  const pages = [`modules/${code}/`];
  for (const sub of ["lectures", "practicum"]) {
    const dir = path.join(d, sub);
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir).filter(x => x.endsWith(".md")).sort()) {
        pages.push(`modules/${code}/${sub}/${f.replace(/\.md$/, "/")}`);
      }
    }
  }
  if (fs.existsSync(path.join(d, "ai-assistant.md"))) pages.push(`modules/${code}/ai-assistant/`);
  const adir = path.join(d, "assessment");
  if (fs.existsSync(adir)) {
    for (const f of fs.readdirSync(adir).filter(x => x.endsWith(".md")).sort()) {
      pages.push(`modules/${code}/assessment/${f.replace(/\.md$/, "/")}`);
    }
  }
  return pages;
}

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
// в PDF квизы не интерактивны: показываем исходный банк, а не вариант слушателя
await ctx.addInitScript(() => {
  localStorage.setItem("folur-student-id", "конспект");
  window.__FOLUR_PDF__ = true;
});
const page = await ctx.newPage();
page.on("dialog", d => d.accept("конспект"));

const manifest = [];
for (const code of MODULES) {
  const parts = [];
  for (const [i, rel] of modulePages(code).entries()) {
    await page.goto(baseUrl + rel, { waitUntil: "networkidle", timeout: 60000 });
    // дождаться рендера mermaid-диаграмм (грузятся с CDN асинхронно)
    await page.waitForFunction(() => {
      const m = document.querySelectorAll(".mermaid, pre.mermaid");
      return m.length === 0 || [...m].every(el => el.querySelector("svg"));
    }, { timeout: 20000 }).catch(() => {});
    const part = path.join(outDir, `${code}-part${String(i).padStart(2, "0")}.pdf`);
    await page.pdf({
      path: part, format: "A4",
      margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" },
      printBackground: false,
    });
    parts.push(part);
  }
  manifest.push({ code, parts, out: path.join(outDir, `${code}-konspekt.pdf`) });
  console.log(`${code}: ${parts.length} страниц-частей готово`);
}
await browser.close();
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log("PDF-части готовы:", outDir);
