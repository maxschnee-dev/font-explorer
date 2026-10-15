// Refreshes fonts.json from the public Google Fonts catalog.
// Run with: npm run update-fonts
import { writeFileSync } from "node:fs";

const res = await fetch("https://fonts.google.com/metadata/fonts");
if (!res.ok) throw new Error(`Catalog request failed: ${res.status}`);
const { familyMetadataList } = await res.json();

const categories = {
  "Sans Serif": "sans-serif",
  Serif: "serif",
  Display: "display",
  Handwriting: "handwriting",
  Monospace: "monospace",
};

const fonts = familyMetadataList
  // Skip italic-only families (just Molle): they have no upright weights to request.
  .filter((f) => Object.keys(f.fonts).some((v) => !v.endsWith("i")))
  .sort((a, b) => a.popularity - b.popularity || a.family.localeCompare(b.family))
  .map((f) => {
    const variants = Object.keys(f.fonts); // e.g. "400", "400i"
    const weights = [...new Set(variants.map((v) => Number(v.replace("i", ""))))].sort((a, b) => a - b);
    return {
      family: f.family,
      designer: f.designers.join(", "),
      category: categories[f.category],
      weights,
      italic: variants.some((v) => v.endsWith("i")),
      styles: variants.length,
      languages: f.subsets.filter((s) => s !== "menu"),
      added: f.dateAdded,
      popularity: f.popularity,
      trending: f.trending,
    };
  });

writeFileSync(new URL("./fonts.json", import.meta.url), "[\n" + fonts.map((f) => JSON.stringify(f)).join(",\n") + "\n]\n");
console.log(`Wrote ${fonts.length} fonts to fonts.json`);
