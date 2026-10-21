"use client";

import { Palette, Theme } from "@/lib/tokens";
import { STYLE_PRESETS, StylePreset, presetPalette } from "@/lib/stylePresets";
import { t, useLang } from "@/lib/i18n";

/* Style presets: one-tap combinations of the existing theme axes — a color scheme
 * with a shape, a typeface, contrast and motion. A preset only sets parameters,
 * so every panel keeps working after one is applied and the author can retune
 * anything by hand, exactly as before. */

export function StylePanel({
  p,
  theme,
  paletteKey,
  onApply,
}: {
  p: Palette;
  theme: Theme;
  paletteKey: string;
  onApply: (patch: { paletteKey: string; customPalette: Palette | null; theme: Partial<Theme> }) => void;
}) {
  const lang = useLang();
  const active = (preset: StylePreset) => {
    if (paletteKey !== preset.paletteKey) return false;
    if (preset.seed && paletteKey === "custom") {
      /* a custom scheme from another source may share the key; the seed decides */
      return p.seed?.toLowerCase() === preset.seed.toLowerCase();
    }
    if (preset.seed) return false;
    return Object.entries(preset.theme).every(([k, v]) => theme[k as keyof Theme] === v);
  };
  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "12px 12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant, padding: "0 4px" }}>{t("presetHint", lang)}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {STYLE_PRESETS.map((preset) => {
          const on = active(preset);
          return (
            <button
              key={preset.key}
              onClick={() => onApply({ paletteKey: preset.paletteKey, customPalette: presetPalette(preset), theme: preset.theme })}
              aria-pressed={on}
              className="m3-press"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 8,
                padding: "12px 12px 10px",
                borderRadius: 16,
                border: "none",
                cursor: "pointer",
                font: "inherit",
                textAlign: "left",
                background: on ? p.secondaryContainer : p.surfaceContainerLow,
                color: on ? p.onSecondaryContainer : p.onSurface,
                outline: on ? `2px solid ${p.primary}` : "2px solid transparent",
                outlineOffset: 1,
              }}
            >
              <span style={{ display: "inline-flex" }}>
                {preset.swatch.map((c, i) => (
                  <span
                    key={i}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      background: c,
                      marginLeft: i === 0 ? 0 : -8,
                      boxShadow: `0 0 0 2px ${on ? p.secondaryContainer : p.surfaceContainerLow}, inset 0 0 0 1px rgba(0,0,0,0.10)`,
                      position: "relative",
                      zIndex: preset.swatch.length - i,
                    }}
                  />
                ))}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(preset.labelKey, lang)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
