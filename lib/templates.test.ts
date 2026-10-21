import { describe, expect, it } from "vitest";
import { TEMPLATES, TEMPLATE_CATEGORIES, buildTemplate, templateFirstScreen } from "./templates";
import { isProject } from "./project";
import { frameOfGroup } from "./tokens";
import { Lang } from "./i18n";

/* Templates are documents in the native format, so the same rules a hand-made or
 * AI-drafted design must satisfy are checked here: the editor can open it, every
 * id is unique, and every tap lands on a screen that exists. */

const WIDTHS = {};
const LANGS_TRY: Lang[] = ["en", "zh", "ja", "ko"];

describe("templates", () => {
  it("ships twelve templates, three per category", () => {
    expect(TEMPLATES).toHaveLength(12);
    for (const cat of TEMPLATE_CATEGORIES) {
      expect(TEMPLATES.filter((t) => t.category === cat.key)).toHaveLength(3);
    }
  });

  it("builds documents the editor can open, in every copy language", () => {
    for (const tpl of TEMPLATES) {
      for (const lang of LANGS_TRY) {
        const doc = buildTemplate(tpl.key, lang, { paletteKey: "purple" });
        expect(isProject(doc), `${tpl.key} (${lang})`).toBe(true);
      }
    }
  });

  it("keeps two to four screens with real copy on every screen", () => {
    for (const tpl of TEMPLATES) {
      const doc = buildTemplate(tpl.key, "en", { paletteKey: "purple" });
      expect(doc.frames.length, tpl.key).toBeGreaterThanOrEqual(2);
      expect(doc.frames.length, tpl.key).toBeLessThanOrEqual(4);
      expect(doc.title.trim()).not.toBe("");
      for (const f of doc.frames) {
        expect((f.name ?? "").trim(), `${tpl.key}/${f.id} name`).not.toBe("");
      }
      // every screen holds at least one part
      for (const f of doc.frames) {
        const onFrame = doc.groups.filter((g) => frameOfGroup(g, doc.frames, WIDTHS)?.id === f.id);
        expect(onFrame.length, `${tpl.key}/${f.id} parts`).toBeGreaterThan(0);
      }
    }
  });

  it("wires every tap to a screen that exists (or back)", () => {
    for (const tpl of TEMPLATES) {
      const doc = buildTemplate(tpl.key, "en", { paletteKey: "purple" });
      const ids = new Set(doc.frames.map((f) => f.id));
      const check = (a: { to: string } | undefined, where: string) => {
        if (!a) return;
        if (a.to === "back") return;
        expect(ids.has(a.to), `${where} -> ${a.to}`).toBe(true);
      };
      for (const g of doc.groups) {
        for (const it of g.items) {
          check(it.action, `${tpl.key}:${it.id}`);
          for (const slot of Object.keys(it.actions ?? {})) check(it.actions?.[slot], `${tpl.key}:${it.id}@${slot}`);
        }
      }
    }
  });

  it("uses unique ids across the whole document", () => {
    for (const tpl of TEMPLATES) {
      const doc = buildTemplate(tpl.key, "en", { paletteKey: "purple" });
      const ids = [...doc.frames.map((f) => f.id), ...doc.groups.map((g) => g.id), ...doc.groups.flatMap((g) => g.items.map((it) => it.id))];
      expect(new Set(ids).size, tpl.key).toBe(ids.length);
    }
  });

  it("gives the thumbnail the same first screen the document opens with", () => {
    for (const tpl of TEMPLATES) {
      const doc = buildTemplate(tpl.key, "en", { paletteKey: "purple" });
      const first = templateFirstScreen(tpl.key, "en");
      expect(first.frame.id).toBe(doc.frames[0].id);
    }
  });
});
