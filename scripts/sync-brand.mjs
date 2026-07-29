import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const checkOnly = process.argv.includes("--check");
const failures = [];

const readText = (path) => readFile(new URL(path, root), "utf8");

async function syncText(path, next) {
  const current = await readText(path);
  if (current === next) return;

  if (checkOnly) {
    failures.push(`${path} is not synchronized with brand/brand.config.json.`);
    return;
  }

  await writeFile(new URL(path, root), next, "utf8");
  console.log(`Updated ${path}`);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const config = JSON.parse(await readText("brand/brand.config.json"));

const manifestPath = "public/manifest.json";
const manifest = JSON.parse(await readText(manifestPath));
manifest.name = config.name;
manifest.short_name = config.shortName;
manifest.description = config.description;
manifest.theme_color = "#07365F";
manifest.categories = ["business", "finance", "productivity", "utilities"];
await syncText(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const offlinePath = "public/offline.html";
let offline = await readText(offlinePath);
offline = offline
  .replace(/<title>Offline \| [^<]+<\/title>/, `<title>Offline | ${escapeHtml(config.name)}</title>`)
  .replace(
    /(<div class="brand">[\s\S]*?<span>)[^<]*(<\/span>\s*<\/div>)/,
    `$1${escapeHtml(config.name)}$2`,
  );
await syncText(offlinePath, offline);

const iconPath = "public/icons/icon.svg";
let icon = await readText(iconPath);
icon = icon.replace(/aria-label="[^"]* app icon"/, `aria-label="${escapeHtml(config.name)} app icon"`);
await syncText(iconPath, icon);

const showcasePath = "public/readme/jalvoro-platform-hero.svg";
let showcase = await readText(showcasePath);
showcase = showcase
  .replace(/<title id="title">[^<]+ product showcase<\/title>/, `<title id="title">${escapeHtml(config.name)} product showcase</title>`)
  .replace(/(<text x="78" y="30"[^>]*>)[^<]+(<\/text>)/, `$1${escapeHtml(config.name)}$2`);
await syncText(showcasePath, showcase);

const tokenPath = "public/brand/icon-tokens.json";
const tokenOutput = {
  ...config.iconSystem,
  status: "foundation",
  safeArea: 2,
  notes:
    "The final custom JALVORO logo and product icon set can replace the temporary assets without changing consuming application code.",
};
await syncText(tokenPath, `${JSON.stringify(tokenOutput, null, 2)}\n`);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log(checkOnly ? "Brand-generated files are synchronized." : "Brand synchronization complete.");
