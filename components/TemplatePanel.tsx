"use client";

import { useMemo, useState } from "react";
import { Doc, Frame, Group, Palette, Theme, frameOfGroup, frameSizeOf, layoutOf } from "@/lib/tokens";
import { TEMPLATES, TEMPLATE_CATEGORIES, TemplateCategory, TemplateDef, buildTemplate } from "@/lib/templates";
import { t, useLang } from "@/lib/i18n";
import { M3Node } from "./M3Node";

/* The templates panel: starter designs in the native document format, one tap to
 * load. Thumbnails are rendered from each template's first screen with the same
 * part renderer the canvas uses — nothing is drawn by hand. Loading goes through
 * the editor's arrive() path, which keeps the replaced design around as a draft
 * the author can undo, so an existing design is never lost silently. */

const THUMB_W = 152;

function TemplateThumb({ frame, groups, palette }: { frame: Frame; groups: Group[]; palette: Palette }) {
  const { w, h } = frameSizeOf(frame);
  const scale = THUMB_W / w;
  const placed = useMemo(
    () =>
      groups
        .flatMap((g) => layoutOf(g, {}))
        .map((pl) => ({ ...pl, x: pl.x - frame.x, y: pl.y - frame.y })),
    [frame, groups],
  );
  return (
    <div
      style={{
        width: THUMB_W,
        height: Math.round(h * scale),
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        background: palette.surface,
        flex: "0 0 auto",
        boxShadow: `inset 0 0 0 1px ${palette.outlineVariant}`,
      }}
      aria-hidden="true"
    >
      <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", pointerEvents: "none" }}>
        {placed.map((pl) => (
          <div key={pl.item.id} style={{ position: "absolute", left: pl.x, top: pl.y }}>
            <M3Node item={pl.item} palette={palette} widths={{}} interactive={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** one template row: its document is built once with the author's own palette and
 *  theme kept, so what loads is structure only — the look stays theirs */
function TemplateCard({
  tpl,
  p,
  keep,
  onLoad,
}: {
  tpl: TemplateDef;
  p: Palette;
  keep: { paletteKey: string; customPalette?: Doc["customPalette"]; dynamicColor?: boolean; theme?: Doc["theme"] };
  onLoad: (doc: Doc) => void;
}) {
  const lang = useLang();
  const doc = useMemo(() => buildTemplate(tpl.key, lang, keep), [tpl, lang, keep]);
  const frame = doc.frames[0];
  const groups = useMemo(() => doc.groups.filter((g) => frameOfGroup(g, doc.frames, {})?.id === frame.id), [doc, frame]);
  return (
    <button
      onClick={() => onLoad(doc)}
      className="m3-press"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: 10,
        borderRadius: 16,
        border: "none",
        cursor: "pointer",
        font: "inherit",
        textAlign: "left",
        background: p.surfaceContainerLow,
        color: p.onSurface,
      }}
    >
      <TemplateThumb frame={frame} groups={groups} palette={p} />
      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{t(tpl.nameKey, lang)}</span>
        <span style={{ fontSize: 12, color: p.onSurfaceVariant }}>
          {doc.frames.length} {t("tplScreens", lang)}
        </span>
      </span>
    </button>
  );
}

export function TemplatePanel({
  p,
  paletteKey,
  customPalette,
  dynamicColor,
  theme,
  onLoad,
}: {
  p: Palette;
  paletteKey: string;
  customPalette?: Palette | null;
  dynamicColor?: boolean;
  theme?: Doc["theme"];
  onLoad: (doc: Doc) => void;
}) {
  const lang = useLang();
  const [cat, setCat] = useState<TemplateCategory>(TEMPLATE_CATEGORIES[0].key);
  const keep = { paletteKey, customPalette: customPalette ?? undefined, dynamicColor, theme };
  const shown = TEMPLATES.filter((tpl) => tpl.category === cat);
  return (
    <div className="no-scrollbar" style={{ height: "100%", overflowY: "auto", padding: "12px 12px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: p.onSurfaceVariant, padding: "0 4px" }}>{t("tplHint", lang)}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            aria-pressed={cat === c.key}
            className="m3-press"
            style={{
              border: "none",
              cursor: "pointer",
              font: "inherit",
              fontSize: 12.5,
              fontWeight: 600,
              padding: "6px 14px",
              borderRadius: 999,
              background: cat === c.key ? p.primary : p.surfaceContainerHigh,
              color: cat === c.key ? p.onPrimary : p.onSurfaceVariant,
            }}
          >
            {t(c.labelKey, lang)}
          </button>
        ))}
      </div>
      {shown.map((tpl) => (
        <TemplateCard key={tpl.key} tpl={tpl} p={p} keep={keep} onLoad={onLoad} />
      ))}
    </div>
  );
}
