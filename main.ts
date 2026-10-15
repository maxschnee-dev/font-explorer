import "./style.css";
import { fonts, fontStack, loadFont, weightNames, type Font } from "./fonts";

const DEFAULT_TEXT = "The quick brown fox jumps over the lazy dog.";
const PAGE_SIZE = 12;
const STORAGE_KEY = "font-explorer:favorites";

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;

const searchForm = $<HTMLFormElement>("#search-form");
const search = $<HTMLInputElement>("#search");
const filters = $<HTMLFormElement>("#filters");
const sortSelect = $<HTMLSelectElement>("#sort");
const grid = $("#font-grid");
const sentinel = $("#sentinel");
const favoritesList = $("#favorites-list");
const previewForm = $<HTMLFormElement>("#preview-form");
const previewInput = $<HTMLInputElement>("#preview-text");
const previewSelect = $<HTMLSelectElement>("#preview-font");

let onlyFavorites = false;
let shownCount = PAGE_SIZE;
let previewText = DEFAULT_TEXT;
let previewFamily = "Montserrat";
const favorites = new Set<string>(loadFavorites());

const scrollObserver = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && loadMore(), {
  rootMargin: "300px",
});

// ---------- Helpers ----------

function loadFavorites(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : ["Roboto", "Montserrat"];
  } catch {
    return [];
  }
}

const esc = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const icon = (name: string, classes: string) =>
  `<svg class="icon ${classes}" aria-hidden="true"><use href="#i-${name}" /></svg>`;

function favButton(font: Font) {
  const on = favorites.has(font.family);
  return `<button type="button" data-fav="${font.family}" aria-pressed="${on}" aria-label="Favorite ${font.family}"
    class="rounded-full p-1 hover:bg-slate-100 ${on ? "text-red-500" : "text-slate-700"}">
    ${icon("heart", `size-5 ${on ? "fill-red-500" : ""}`)}</button>`;
}

const weightName = (w: number) => weightNames[w] ?? String(w);
const formatCount = (n: number) => n.toLocaleString("en-US");

// Up to four weights shown on a card, preferring everyday weights (400–700).
function cardWeights(font: Font) {
  const common = font.weights.filter((w) => w >= 400 && w <= 700);
  return (common.length >= 2 ? common : font.weights).slice(0, 4);
}

function scrollToFonts() {
  $("#fonts").scrollIntoView();
}

// ---------- Filtering ----------

function visibleFonts(): Font[] {
  const data = new FormData(filters);
  const categories = data.getAll("category") as string[];
  const ranges = (data.getAll("styles") as string[]).map((r) => r.split("-").map(Number));
  const language = data.get("language") as string;
  const query = search.value.trim().toLowerCase();

  const list = fonts.filter((f) => {
    return (
      (!onlyFavorites || favorites.has(f.family)) &&
      (!categories.length || categories.includes(f.category)) &&
      (!language || f.languages.includes(language)) &&
      (!ranges.length || ranges.some(([min, max]) => f.styles >= min && f.styles <= max)) &&
      (!query || `${f.family} ${f.designer} ${f.category}`.toLowerCase().includes(query))
    );
  });

  // `fonts` is already in popularity order, and sort is stable.
  if (sortSelect.value === "trending") list.sort((a, b) => a.trending - b.trending);
  if (sortSelect.value === "newest") list.sort((a, b) => b.added.localeCompare(a.added));
  if (sortSelect.value === "name") list.sort((a, b) => a.family.localeCompare(b.family));
  return list;
}

// ---------- Rendering ----------

function renderNav() {
  const active = onlyFavorites
    ? "favorites"
    : sortSelect.value === "trending"
      ? "trending"
      : sortSelect.value === "newest"
        ? "recent"
        : "all";
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((button) => {
    if (button.dataset.nav === active) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
}

function cardsHtml(list: Font[]) {
  return list
    .map((f) => {
      const weights = cardWeights(f);
      loadFont(f, weights);
      return `
    <article class="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="truncate font-semibold">${f.family}</h3>
          <p class="line-clamp-1 text-xs text-slate-500">${esc(f.designer)}</p>
        </div>
        <div class="flex shrink-0 items-center gap-1 text-xs text-slate-500">${f.styles} styles ${favButton(f)}</div>
      </div>
      <p class="my-5 line-clamp-3 text-3xl leading-tight break-words" style="font-family:${fontStack(f)}">${esc(previewText)}</p>
      <div class="mt-auto flex items-center justify-between gap-2">
        <ul class="flex flex-wrap gap-x-4 text-xs text-slate-500">${weights.map((w) => `<li style="font-family:${fontStack(f)};font-weight:${w}">${weightName(w)}</li>`).join("")}</ul>
        <button type="button" data-preview="${f.family}" aria-label="Preview ${f.family} in all styles" class="rounded-full p-1 hover:bg-slate-100">${icon("chevron-right", "size-5")}</button>
      </div>
    </article>`;
    })
    .join("");
}

function updateResults(total: number) {
  $("#results").textContent = `Showing ${formatCount(Math.min(shownCount, total))} of ${formatCount(total)} fonts`;
}

function renderGrid() {
  const list = visibleFonts();

  $("#fonts-title").textContent = onlyFavorites
    ? "Your Favorites"
    : sortSelect.value === "trending"
      ? "Trending Fonts"
      : sortSelect.value === "newest"
        ? "Recently Added"
        : sortSelect.value === "name"
          ? "All Fonts"
          : "Popular Fonts";
  updateResults(list.length);

  grid.innerHTML = list.length
    ? cardsHtml(list.slice(0, shownCount))
    : `<p class="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No fonts match. Try changing or resetting the filters.</p>`;

  // Re-check the sentinel so a short page keeps filling until it overflows.
  scrollObserver.unobserve(sentinel);
  scrollObserver.observe(sentinel);
}

// Infinite scroll: append the next batch when the sentinel nears the viewport.
function loadMore() {
  const list = visibleFonts();
  if (shownCount >= list.length) return;
  const next = list.slice(shownCount, shownCount + PAGE_SIZE);
  shownCount += PAGE_SIZE;
  grid.insertAdjacentHTML("beforeend", cardsHtml(next));
  updateResults(list.length);
  scrollObserver.unobserve(sentinel);
  scrollObserver.observe(sentinel);
}

function renderFavorites() {
  const list = fonts.filter((f) => favorites.has(f.family));
  document.querySelectorAll("[data-fav-count]").forEach((el) => (el.textContent = String(list.length)));
  favoritesList.innerHTML = list.length
    ? list
        .map(
          (f) => `
    <li class="flex items-center justify-between py-2.5">
      <div><p class="text-sm font-semibold">${f.family}</p><p class="text-xs text-slate-500">${f.styles} styles</p></div>
      ${favButton(f)}
    </li>`,
        )
        .join("")
    : `<li class="py-2.5 text-sm text-slate-500">No favorites yet. Tap a heart to save a font.</li>`;
}

function renderPreview() {
  const font = fonts.find((f) => f.family === previewFamily)!;
  loadFont(font, font.weights);
  previewSelect.value = font.family;
  $("#preview-rows").innerHTML = font.weights
    .map(
      (w) => `
    <li class="flex items-baseline justify-between gap-3 py-2">
      <span class="truncate text-sm" style="font-family:${fontStack(font)};font-weight:${w}">${esc(previewText)}</span>
      <span class="shrink-0 text-[0.65rem] text-slate-400">${weightName(w)}</span>
    </li>`,
    )
    .join("");
}

// One-time setup: the font dropdown and the language filter are built from the catalog.
function renderOptions() {
  previewSelect.innerHTML = fonts.map((f) => `<option value="${f.family}">${f.family}</option>`).join("");

  const counts = new Map<string, number>();
  for (const f of fonts) for (const l of f.languages) counts.set(l, (counts.get(l) ?? 0) + 1);
  const label = (l: string) => l.replace(/(^|-)(\w)/g, (_, dash, c) => (dash ? " " : "") + c.toUpperCase());
  $("#language").insertAdjacentHTML(
    "beforeend",
    [...counts].sort((a, b) => b[1] - a[1]).map(([l]) => `<option value="${l}">${label(l)}</option>`).join(""),
  );
}

function render() {
  renderNav();
  renderGrid();
  renderFavorites();
}

// ---------- Events ----------

filters.addEventListener("input", () => {
  shownCount = PAGE_SIZE;
  render();
});
filters.addEventListener("submit", (e) => e.preventDefault());

search.addEventListener("input", () => {
  shownCount = PAGE_SIZE;
  render();
});
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  scrollToFonts();
});

previewForm.addEventListener("submit", (e) => {
  e.preventDefault();
  previewText = previewInput.value.trim() || DEFAULT_TEXT;
  render();
  renderPreview();
});
previewSelect.addEventListener("change", () => {
  previewFamily = previewSelect.value;
  renderPreview();
});

function resetFilters() {
  filters.reset();
  search.value = "";
  onlyFavorites = false;
  shownCount = PAGE_SIZE;
}

function setCategory(category: string) {
  resetFilters();
  filters.querySelector<HTMLInputElement>(`[name=category][value="${category}"]`)!.checked = true;
}

const navActions: Record<string, () => void> = {
  all: resetFilters,
  trending: () => {
    onlyFavorites = false;
    sortSelect.value = "trending";
  },
  recent: () => {
    onlyFavorites = false;
    sortSelect.value = "newest";
  },
  favorites: () => {
    onlyFavorites = true;
  },
  categories: () => {
    filters.querySelector("input")!.focus();
  },
};

document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const nav = target.closest<HTMLElement>("[data-nav]");
  const fav = target.closest<HTMLElement>("[data-fav]");
  const preview = target.closest<HTMLElement>("[data-preview]");
  const collection = target.closest<HTMLElement>("[data-collection]");

  if (nav) {
    navActions[nav.dataset.nav!]();
    render();
    if (nav.dataset.nav !== "categories") scrollToFonts();
  } else if (fav) {
    const family = fav.dataset.fav!;
    const region = fav.closest<HTMLElement>("[data-region]")!;
    if (!favorites.delete(family)) favorites.add(family);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    render();
    // Re-rendering replaced the button, so put keyboard focus back.
    (region.querySelector<HTMLElement>(`[data-fav="${family}"]`) ?? region).focus();
  } else if (preview) {
    previewFamily = preview.dataset.preview!;
    renderPreview();
    $("#preview").scrollIntoView();
  } else if (collection) {
    setCategory(collection.dataset.collection!);
    render();
    scrollToFonts();
  } else if (target.closest("#reset-filters")) {
    resetFilters();
    render();
  } else if (target.closest("#open-favorites, #view-favorites")) {
    onlyFavorites = true;
    render();
    scrollToFonts();
  }
});

renderOptions();
render();
renderPreview();
