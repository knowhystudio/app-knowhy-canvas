import { Theme } from "./tokens";
import { schemeFromSeed } from "./color";
import { getLang, t } from "./i18n";

/* Style presets: one-tap combinations of what the theme system already offers —
 * a color scheme (a built-in palette key, or a scheme generated from a seed) plus
 * the shape, type, contrast and motion axes. A preset sets parameters only; the
 * components stay untouched, and every control keeps working after one is applied,
 * so the author can微调 from there — same as any hand-picked combination. */

export type StylePreset = {
  key: "monoMinimal" | "glass" | "neon" | "cream" | "business" | "forest" | "candy" | "a11y";
  labelKey: "presetMono" | "presetGlass" | "presetNeon" | "presetCream" | "presetBusiness" | "presetForest" | "presetCandy" | "presetA11y";
  /** two dots the panel shows as the preset's swatch */
  swatch: [string, string];
  /** a built-in palette key, or "custom" with `seed` below */
  paletteKey: string;
  /** the seed a custom scheme is generated from; only with paletteKey "custom" */
  seed?: string;
  theme: Partial<Theme>;
};

export const STYLE_PRESETS: StylePreset[] = [
  { key: "monoMinimal", labelKey: "presetMono", swatch: ["#1C1B1F", "#FCF8FD"], paletteKey: "mono", theme: { dark: false, shape: "square", font: "system", contrast: "standard", emphasized: false, motion: "standard" } },
  { key: "glass", labelKey: "presetGlass", swatch: ["#8FA8D8", "#E7EEF9"], paletteKey: "custom", seed: "#8FA8D8", theme: { dark: false, shape: "full", font: "system", contrast: "standard", emphasized: false, motion: "standard" } },
  { key: "neon", labelKey: "presetNeon", swatch: ["#CF5BFF", "#141018"], paletteKey: "custom", seed: "#CF5BFF", theme: { dark: true, shape: "full", font: "robotoFlex", contrast: "medium", emphasized: true, motion: "expressive" } },
  { key: "cream", labelKey: "presetCream", swatch: ["#B98A5E", "#FBF3E8"], paletteKey: "custom", seed: "#C89B6D", theme: { dark: false, shape: "rounded", font: "robotoSerif", contrast: "standard", emphasized: false, motion: "standard" } },
  { key: "business", labelKey: "presetBusiness", swatch: ["#2B4C7E", "#F6F9FE"], paletteKey: "blue", theme: { dark: false, shape: "square", font: "system", contrast: "standard", emphasized: false, motion: "standard" } },
  { key: "forest", labelKey: "presetForest", swatch: ["#3E6B4F", "#F2F7F2"], paletteKey: "green", theme: { dark: false, shape: "rounded", font: "roboto", contrast: "standard", emphasized: false, motion: "standard" } },
  { key: "candy", labelKey: "presetCandy", swatch: ["#FF6E9C", "#FFF0F5"], paletteKey: "coral", theme: { dark: false, shape: "full", font: "robotoFlex", contrast: "standard", emphasized: true, motion: "expressive" } },
  { key: "a11y", labelKey: "presetA11y", swatch: ["#000000", "#FFFFFF"], paletteKey: "mono", theme: { dark: false, shape: "square", font: "system", contrast: "high", emphasized: false, motion: "standard" } },
];

/** the palette a preset stands for: the built-in one, or a scheme grown from its seed.
 *  The label is the preset's localized name — it is what the prompt and the color
 *  panel show afterwards. */
export function presetPalette(preset: StylePreset) {
  return preset.seed ? schemeFromSeed(preset.seed, t(preset.labelKey, getLang())) : null;
}
