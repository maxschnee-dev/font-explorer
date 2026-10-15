// The Google Fonts catalog lives in fonts.json (refresh it with `npm run update-fonts`).
// It is ordered by popularity.
import catalog from "./fonts.json";

export type Category = "serif" | "sans-serif" | "display" | "handwriting" | "monospace";

export interface Font {
  family: string;
  designer: string;
  category: Category;
  weights: number[]; // upright weights
  italic: boolean;
  styles: number;
  languages: string[];
  added: string; // YYYY-MM-DD
  popularity: number; // lower is more popular
  trending: number; // lower is more trending
}

export const fonts = catalog as Font[];

export const weightNames: Record<number, string> = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
  1000: "ExtraBlack",
};

const generic: Record<Category, string> = {
  serif: "serif",
  "sans-serif": "sans-serif",
  display: "sans-serif",
  handwriting: "cursive",
  monospace: "monospace",
};

// CSS font-family value, safe to use inside a double-quoted style attribute.
export const fontStack = (font: Font) => `'${font.family}', ${generic[font.category]}`;

// Fonts are loaded on demand, one stylesheet per family and set of weights.
const loaded = new Set<string>();

export function loadFont(font: Font, weights: number[]) {
  const family = encodeURIComponent(font.family).replaceAll("%20", "+");
  const query = `${family}:wght@${weights.join(";")}`;
  if (loaded.has(query)) return;
  loaded.add(query);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
  document.head.append(link);
}
