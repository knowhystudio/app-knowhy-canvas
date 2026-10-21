import { Doc, DESKTOP_H, DESKTOP_W, Frame, Group, IPHONE_H, IPHONE_W, Item, Kind, makeItem, PHONE_H, PHONE_W, WEB_H, WEB_W } from "./tokens";
import { Lang } from "./i18n";

/* Starter templates. Each one is a plain document in the native format — the same
 * shape a hand-made design or an AI draft takes — so loading one is exactly like
 * opening a design: every screen stays editable, the tap preview walks it, and the
 * prompt compiler reads it without any special casing here. Copy is authored in
 * Chinese and English; other UI languages fall back to the English copy. */

export type TemplateCategory = "account" | "social" | "commerce" | "media";

export const TEMPLATE_CATEGORIES: { key: TemplateCategory; labelKey: "tplCatAccount" | "tplCatSocial" | "tplCatCommerce" | "tplCatMedia" }[] = [
  { key: "account", labelKey: "tplCatAccount" },
  { key: "social", labelKey: "tplCatSocial" },
  { key: "commerce", labelKey: "tplCatCommerce" },
  { key: "media", labelKey: "tplCatMedia" },
];

/** the copy languages a template ships with */
type CopyLang = "zh" | "en";
const copyLang = (lang: Lang): CopyLang => (lang === "zh" ? "zh" : "en");
/** zh is optional: strings already written per-language at the call site carry en only */
type Copy = { zh?: string; en: string };
const c = (copy: Copy, lang: Lang) => copy[copyLang(lang)] ?? copy.en;

const SCREEN_GAP = 80;

/* ---------- part builders (native item fields only) ---------- */

let seq = 0;
/** a fresh id, stable within one build pass */
const nid = (prefix: string) => `${prefix}${(seq++).toString(36)}`;

const it = (kind: Kind, patch: Partial<Item>): Item => ({ ...makeItem(kind), ...patch });

const bar = (title: Copy, lang: Lang, back = false): Item =>
  it("topAppBar", {
    id: nid("bar"),
    label: c(title, lang),
    icon: back ? "arrow_back" : null,
    variant: "filled",
    ...(back ? { action: { to: "back", transition: "slide" as const } } : {}),
  });

const nav = (tabs: { icon: string; label: Copy; to?: string }[], lang: Lang, selected = 0): Item => {
  const actions: Record<string, { to: string; transition: "fade" }> = {};
  tabs.forEach((tab, i) => {
    if (tab.to && i !== selected) actions[`tab:${i}`] = { to: tab.to, transition: "fade" };
  });
  return it("bottomNav", {
    id: nid("nav"),
    label: "",
    icon: null,
    variant: "filled",
    tabs: tabs.map((tab) => ({ icon: tab.icon, label: c(tab.label, lang) })),
    selected,
    ...(Object.keys(actions).length ? { actions } : {}),
  });
};

const field = (label: Copy, lang: Lang, kind: "textField" | "select" = "textField", icon: string | null = null): Item =>
  it(kind, { id: nid("f"), label: c(label, lang), icon, variant: "outlined" });

const button = (label: Copy, lang: Lang, to?: string, size?: number): Item =>
  it("button", {
    id: nid("btn"),
    label: c(label, lang),
    icon: null,
    variant: "filled",
    ...(size ? { size } : {}),
    ...(to ? { action: { to, transition: "slide" as const } } : {}),
  });

const row = (label: Copy, lang: Lang, opts: { icon?: string | null; supporting?: Copy; to?: string; icon2?: string | null } = {}): Item =>
  it("listItem", {
    id: nid("r"),
    label: c(label, lang),
    supporting: opts.supporting ? c(opts.supporting, lang) : undefined,
    icon: opts.icon === undefined ? "person" : opts.icon,
    icon2: opts.icon2,
    variant: "filled",
    ...(opts.to ? { action: { to: opts.to, transition: "slide" as const } } : {}),
  });

const chipRow = (labels: Copy[], lang: Lang): Group => ({
  id: nid("g"),
  x: 16,
  y: 0,
  axis: "x",
  items: labels.map((label) => it("chip", { id: nid("chip"), label: c(label, lang), icon: null, variant: "filled" })),
});

const text = (label: Copy, lang: Lang, size = 28, bold = false): Item =>
  it("text", { id: nid("t"), label: c(label, lang), icon: null, variant: "filled", size, ...(bold ? { bold } : {}) });

const card = (title: Copy, body: Copy, lang: Lang, opts: { size2?: number; to?: string } = {}): Item =>
  it("card", {
    id: nid("c"),
    label: c(title, lang),
    supporting: c(body, lang),
    icon: "photo_library",
    variant: "filled",
    ...(opts.size2 ? { size2: opts.size2 } : {}),
    ...(opts.to ? { action: { to: opts.to, transition: "slide" as const } } : {}),
  });

const rows = (id: string, x: number, y: number, items: Item[]): Group => ({ id, x, y, axis: "y", items });

/* ---------- screen assembly ---------- */

type PartSpec = { id: string; x: number; y: number; axis: "x" | "y"; items: Item[] };
type ScreenSpec = { id: string; name: Copy; note?: Copy; parts: PartSpec[] };

const BAR_H = 88;
const NAV_H = 104;

/** a screen spec plus the bar and nav every app screen shares, laid out on the M3 grid */
function screen(id: string, name: Copy, note: Copy, lang: Lang, parts: PartSpec[], opts: { back?: boolean; nav?: Item } = {}): ScreenSpec {
  const all: PartSpec[] = [
    { id: nid("g"), x: 0, y: 0, axis: "x", items: [bar(name, lang, opts.back)] },
    ...parts,
    ...(opts.nav ? [{ id: nid("g"), x: 0, y: PHONE_H - NAV_H, axis: "x" as const, items: [opts.nav] }] : []),
  ];
  return { id, name, note, parts: all };
}

const BODY_Y = BAR_H + 16;

function assemble(specs: ScreenSpec[], title: string, brief: string, lang: Lang, device: TemplateDevice = "phone"): Pick<Doc, "title" | "brief" | "frames" | "groups"> {
  const { w, h } = device === "iphone" ? { w: IPHONE_W, h: IPHONE_H } : device === "web" ? { w: WEB_W, h: WEB_H } : device === "desktop" ? { w: DESKTOP_W, h: DESKTOP_H } : { w: PHONE_W, h: PHONE_H };
  const frames: Frame[] = [];
  const groups: Group[] = [];
  specs.forEach((spec, i) => {
    const fx = i * (w + SCREEN_GAP);
    frames.push({
      id: spec.id,
      name: c(spec.name, lang),
      x: fx,
      y: 0,
      ...(device === "phone" ? {} : { kind: device, w, h }),
      note: spec.note ? c(spec.note, lang) : undefined,
    });
    for (const part of spec.parts) {
      groups.push({ id: nid("g"), x: fx + part.x, y: part.y, axis: part.axis, items: part.items });
    }
  });
  return { title, brief, frames, groups };
}

/* ---------- the templates: twelve phone flows, then the multi-device set ---------- */

export type TemplateDevice = "phone" | "iphone" | "web" | "desktop";

export type TemplateDef = {
  key: string;
  category: TemplateCategory;
  device: TemplateDevice;
  nameKey:
    | "tplSignin" | "tplOnboarding" | "tplProfile" | "tplFeed" | "tplChat" | "tplPost" | "tplShop" | "tplProduct" | "tplCart" | "tplMusic" | "tplWeather" | "tplFinance"
    | "tplIosSignin" | "tplIosOnboarding" | "tplIosFeed" | "tplIosChat" | "tplIosMusic" | "tplIosWeather"
    | "tplWebLanding" | "tplWebDashboard" | "tplWebBlog"
    | "tplDeskMusic" | "tplDeskSettings";
  build: (lang: Lang) => Pick<Doc, "title" | "brief" | "frames" | "groups">;
};

export const TEMPLATES: TemplateDef[] = [
  {
    key: "signin",
    category: "account",
    device: "phone",
    nameKey: "tplSignin",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("signin", { en: "Sign in", zh: "登录" }, { en: "Returning users sign in with email.", zh: "老用户用邮箱登录。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y + 24, axis: "y", items: [text({ en: "Welcome back", zh: "欢迎回来" }, lang, 32, true), text({ en: "Sign in to keep your garden growing.", zh: "登录后继续打理你的花园。" }, lang, 15)] },
        { id: nid("g"), x: 16, y: BODY_Y + 140, axis: "y", items: [field({ en: "Email", zh: "邮箱" }, lang, "textField", "mail"), field({ en: "Password", zh: "密码" }, lang, "textField", "lock")] },
        { id: nid("g"), x: 16, y: BODY_Y + 296, axis: "y", items: [button({ en: "Sign in", zh: "登录" }, lang, "signup", 380), it("text", { id: nid("t"), label: c({ en: "Forgot password?", zh: "忘记密码？" }, lang), icon: null, variant: "filled", size: 14, action: { to: "reset", transition: "slide" } })] },
      ], { nav: nav([{ icon: "login", label: { en: "Sign in", zh: "登录" } }, { icon: "person_add", label: { en: "Sign up", zh: "注册" }, to: "signup" }], lang, 0) });
      const s2 = screen("signup", { en: "Sign up", zh: "注册" }, { en: "New users create an account.", zh: "新用户创建账号。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [field({ en: "Nickname", zh: "昵称" }, lang, "textField", "person"), field({ en: "Email", zh: "邮箱" }, lang, "textField", "mail"), field({ en: "Password", zh: "密码" }, lang, "textField", "lock")] },
        { id: nid("g"), x: 16, y: BODY_Y + 236, axis: "y", items: [button({ en: "Create account", zh: "创建账号" }, lang, "back", 380)] },
      ], { back: true });
      const s3 = screen("reset", { en: "Reset password", zh: "重置密码" }, { en: "A reset link is sent by email.", zh: "重置链接将通过邮件发送。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [text({ en: "Check your inbox", zh: "查收邮箱" }, lang, 24, true), field({ en: "Email", zh: "邮箱" }, lang, "textField", "mail"), button({ en: "Send reset link", zh: "发送重置链接" }, lang, "back", 380)] },
      ], { back: true });
      return assemble([s1, s2, s3], zh ? "花园记" : "Bloom", zh ? "照顾家中植物的提醒与日志应用。" : "Care reminders and a journal for house plants.", lang);
    },
  },
  {
    key: "onboarding",
    category: "account",
    device: "phone",
    nameKey: "tplOnboarding",
    build: (lang) => {
      const zh = lang === "zh";
      const slide = (id: string, i: number, glyph: string, head: Copy, sub: Copy, last: boolean): ScreenSpec =>
        screen(id, { en: `Welcome ${i + 1}`, zh: `引导 ${i + 1}` }, { en: sub.en, zh: sub.zh }, lang, [
          { id: nid("g"), x: 106, y: 200, axis: "x", items: [it("box", { id: nid("box"), label: "", icon: null, variant: "filled", size: 200, size2: 200, radiusTop: 100, radiusBottom: 100, fill: "primaryContainer" })] },
          { id: nid("g"), x: 176, y: 270, axis: "x", items: [it("iconButton", { id: nid("ic"), label: "", icon: glyph, variant: "filled", size: 60 })] },
          { id: nid("g"), x: 46, y: 452, axis: "y", items: [text(head, lang, 30, true), text(sub, lang, 15)] },
          { id: nid("g"), x: 156, y: 560, axis: "x", items: [0, 1, 2].map((d) => it("box", { id: nid("dot"), label: "", icon: null, variant: "filled", size: d === i ? 28 : 8, size2: 8, radiusTop: 4, radiusBottom: 4, fill: d === i ? "primary" : "surfaceContainerHighest" })) },
          { id: nid("g"), x: 16, y: 640, axis: "y", items: [button(last ? { en: "Get started", zh: "开始使用" } : { en: "Next", zh: "下一步" }, lang, last ? "back" : `slide${i + 2}`, 380), it("text", { id: nid("t"), label: c({ en: "Skip", zh: "跳过" }, lang), icon: null, variant: "filled", size: 14, ...(last ? {} : { action: { to: "back" as const, transition: "fade" as const } }) })] },
        ]);
      const s1 = slide("slide1", 0, "psychology", { en: "Learn a little, every day", zh: "每天进步一点点" }, { en: "Five-minute lessons that fit your morning.", zh: "五分钟一课，装进你的清晨。" }, false);
      const s2 = slide("slide2", 1, "track_changes", { en: "See yourself improve", zh: "看见自己的进步" }, { en: "Streaks and stats keep you honest.", zh: "连续打卡和数据替你记账。" }, false);
      const s3 = slide("slide3", 2, "emoji_events", { en: "Reach your first goal", zh: "达成第一个目标" }, { en: "Set a goal and we will plan the rest.", zh: "设一个目标，剩下的交给我们。" }, true);
      return assemble([s1, s2, s3], zh ? "句句学" : "Lingo", zh ? "碎片时间的语言学习应用。" : "Bite-size language learning.", lang);
    },
  },
  {
    key: "profile",
    category: "account",
    device: "phone",
    nameKey: "tplProfile",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("profile", { en: "Profile", zh: "个人主页" }, { en: "The user's public page and entry to settings.", zh: "用户主页，也是设置的入口。" }, lang, [
        { id: nid("g"), x: 158, y: BODY_Y + 8, axis: "y", items: [it("image", { id: nid("av"), label: "", icon: null, variant: "filled", size: 96 })] },
        { id: nid("g"), x: 106, y: BODY_Y + 120, axis: "y", items: [text({ en: "Lin Xiao", zh: "林晓" }, lang, 24, true), text({ en: "Product designer · Shanghai", zh: "产品设计师 · 上海" }, lang, 14)] },
        { id: nid("g"), x: 16, y: BODY_Y + 208, axis: "y", items: [
          row({ en: "Edit profile", zh: "编辑资料" }, lang, { icon: "edit", to: "edit" }),
          row({ en: "Settings", zh: "设置" }, lang, { icon: "settings", to: "settings" }),
          row({ en: "My works", zh: "我的作品" }, lang, { icon: "folder", supporting: { en: "12 projects", zh: "12 个项目" } }),
        ] },
      ], { back: true });
      const s2 = screen("settings", { en: "Settings", zh: "设置" }, { en: "Notifications, appearance and account controls.", zh: "通知、外观与账号设置。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          it("switch", { id: nid("sw1"), label: c({ en: "Push notifications", zh: "推送通知" }, lang), icon: null, variant: "filled", checked: true }),
          it("switch", { id: nid("sw2"), label: c({ en: "Dark mode", zh: "深色模式" }, lang), icon: null, variant: "filled", checked: false }),
          row({ en: "Privacy", zh: "隐私" }, lang, { icon: "lock" }),
          row({ en: "Sign out", zh: "退出登录" }, lang, { icon: "logout" }),
        ] },
      ], { back: true });
      const s3 = screen("edit", { en: "Edit profile", zh: "编辑资料" }, { en: "Change name, title and avatar.", zh: "修改昵称、头衔与头像。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [field({ en: "Name", zh: "昵称" }, lang, "textField", "person"), field({ en: "Title", zh: "头衔" }, lang, "textField", "badge"), button({ en: "Save", zh: "保存" }, lang, "back", 380)] },
      ], { back: true });
      return assemble([s1, s2, s3], zh ? "手作集" : "Craftfolio", zh ? "设计师的个人作品集应用。" : "A portfolio app for designers.", lang);
    },
  },
  {
    key: "feed",
    category: "social",
    device: "phone",
    nameKey: "tplFeed",
    build: (lang) => {
      const zh = lang === "zh";
      const NAVT = { zh: [{ en: "Home", zh: "首页" }, { en: "Search", zh: "搜索" }, { en: "Activity", zh: "动态" }] } as const;
      const nb = (sel: number, to: [string, string, string]) => nav([
        { icon: "home", label: NAVT.zh[0], to: to[0] },
        { icon: "search", label: NAVT.zh[1], to: to[1] },
        { icon: "notifications", label: NAVT.zh[2], to: to[2] },
      ], lang, sel);
      const s1 = screen("feed", { en: "Home", zh: "首页" }, { en: "The following feed: photos and text from accounts the user follows.", zh: "关注流：已关注账号的图文动态。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          card({ en: "Morning run along the river", zh: "清晨沿江跑步打卡" }, { en: "Mei · 12 min ago", zh: "阿梅 · 12 分钟前" }, lang),
          card({ en: "New espresso setup finally dialed in", zh: "新的意式咖啡机终于调好了" }, { en: "Kepler · 1 h ago", zh: "开普勒 · 1 小时前" }, lang),
        ] },
        { id: nid("g"), x: 340, y: PHONE_H - NAV_H - 88, axis: "x", items: [it("fab", { id: nid("fab"), label: "", icon: "add", variant: "filled" })] },
      ], { nav: nb(0, ["feed", "search", "activity"]) });
      const s2 = screen("search", { en: "Search", zh: "搜索" }, { en: "Find people and topics.", zh: "找人、找话题。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [it("searchBar", { id: nid("sb"), label: c({ en: "Search Pulse", zh: "搜索 Pulse" }, lang), icon: null, variant: "filled", icon2: "mic" })] },
        { id: nid("g"), x: 16, y: BODY_Y + 72, axis: "y", items: [
          row({ en: "#film photography", zh: "#胶片摄影" }, lang, { icon: "tag", icon2: "trending_up" }),
          row({ en: "@kepler.cooks", zh: "@开普勒下厨" }, lang, { icon: "person", icon2: "north_east" }),
          row({ en: "#city walks", zh: "#城市漫步" }, lang, { icon: "tag", icon2: "trending_up" }),
        ] },
      ], { nav: nb(1, ["feed", "search", "activity"]) });
      const s3 = screen("activity", { en: "Activity", zh: "动态" }, { en: "Likes, comments and follows.", zh: "点赞、评论与新关注。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          row({ en: "Mei liked your photo", zh: "阿梅 赞了你的照片" }, lang, { icon: "favorite", supporting: { en: "20 min ago", zh: "20 分钟前" } }),
          row({ en: "Kepler started following you", zh: "开普勒 关注了你" }, lang, { icon: "person_add", supporting: { en: "2 h ago", zh: "2 小时前" } }),
          row({ en: "Jun commented: love this!", zh: "阿军 评论：太赞了！" }, lang, { icon: "chat_bubble", supporting: { en: "5 h ago", zh: "5 小时前" } }),
        ] },
      ], { nav: nb(2, ["feed", "search", "activity"]) });
      return assemble([s1, s2, s3], zh ? "脉动" : "Pulse", zh ? "轻量图文社交应用。" : "A lightweight photo-and-text social app.", lang);
    },
  },
  {
    key: "chat",
    category: "social",
    device: "phone",
    nameKey: "tplChat",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("chats", { en: "Chats", zh: "会话" }, { en: "All conversations, unread first.", zh: "全部会话，未读优先。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [it("searchBar", { id: nid("sb"), label: c({ en: "Search chats", zh: "搜索会话" }, lang), icon: null, variant: "filled" })] },
        rows(nid("g"), 16, BODY_Y + 72, [
          row({ en: "Design review group", zh: "设计评审群" }, lang, { icon: "groups", supporting: { en: "Kepler: shipping at 6!", zh: "开普勒：6 点上线！" }, to: "room", icon2: null }),
          row({ en: "Mom", zh: "妈妈" }, lang, { icon: "person", supporting: { en: "Don't forget dinner Sunday", zh: "周日记得回家吃饭" }, to: "room", icon2: null }),
          row({ en: "Running club", zh: "跑团" }, lang, { icon: "directions_run", supporting: { en: "5 km tomorrow, 7 am", zh: "明早 7 点 5 公里" }, to: "room", icon2: null }),
        ]),
      ]);
      const s2 = screen("room", { en: "Chat", zh: "聊天" }, { en: "One conversation: bubbles, then the composer.", zh: "单聊会话：消息气泡与输入栏。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          it("box", { id: nid("m1"), label: "", icon: null, variant: "filled", size: 232, size2: 44, radiusTop: 18, radiusBottom: 18, fill: "surfaceContainerHigh" }),
          it("box", { id: nid("m2"), label: "", icon: null, variant: "filled", size: 180, size2: 44, radiusTop: 18, radiusBottom: 18, fill: "primaryContainer" }),
        ] },
        { id: nid("g"), x: 24, y: BODY_Y + 8, axis: "x", items: [it("text", { id: nid("t1"), label: c({ en: "See you at the studio!", zh: "工作室见！" }, lang), icon: null, variant: "filled", size: 14 })] },
        { id: nid("g"), x: 208, y: BODY_Y + 68, axis: "x", items: [it("text", { id: nid("t2"), label: c({ en: "Bringing the mockups ☕", zh: "带原型图过去 ☕" }, lang), icon: null, variant: "filled", size: 14 })] },
        { id: nid("g"), x: 16, y: 700, axis: "x", items: [
          it("textField", { id: nid("ti"), label: c({ en: "Message", zh: "输入消息" }, lang), icon: null, variant: "filled", size: 316 }),
          it("iconButton", { id: nid("send"), label: "", icon: "send", variant: "filled" }),
        ] },
      ], { back: true });
      return assemble([s1, s2], zh ? "回声" : "Echo", zh ? "熟人之间的即时通讯应用。" : "Instant messaging for close circles.", lang);
    },
  },
  {
    key: "post",
    category: "social",
    device: "phone",
    nameKey: "tplPost",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("detail", { en: "Post", zh: "动态详情" }, { en: "One post with its photo, actions and top comments.", zh: "单条动态：正文、互动与热门评论。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          it("listItem", { id: nid("au"), label: c({ en: "Mei", zh: "阿梅" }, lang), supporting: c({ en: "12 min ago · Riverside", zh: "12 分钟前 · 江边" }, lang), icon: "person", icon2: null, variant: "filled" }),
          card({ en: "Morning run along the river", zh: "清晨沿江跑步打卡" }, { en: "6.2 km · 34 min · sunrise was worth it", zh: "6.2 公里 · 34 分钟 · 日出太值了" }, lang, { size2: 220 }),
        ] },
        { id: nid("g"), x: 16, y: BODY_Y + 320, axis: "x", items: [
          it("iconButton", { id: nid("like"), label: "", icon: "favorite", variant: "text" }),
          it("iconButton", { id: nid("cmt"), label: "", icon: "chat_bubble", variant: "text", action: { to: "comments", transition: "slideUp" } }),
          it("iconButton", { id: nid("shr"), label: "", icon: "share", variant: "text" }),
        ] },
        { id: nid("g"), x: 16, y: BODY_Y + 384, axis: "y", items: [
          it("listItem", { id: nid("cm1"), label: c({ en: "Jun: love this route!", zh: "阿军：这条路线太爱了！" }, lang), icon: "person", icon2: null, variant: "filled" }),
          it("listItem", { id: nid("cm2"), label: c({ en: "Kepler: what shoes are those?", zh: "开普勒：脚上是什么鞋？" }, lang), icon: "person", icon2: null, variant: "filled" }),
        ] },
      ], { back: true });
      const s2 = screen("comments", { en: "Comments", zh: "评论" }, { en: "All comments, oldest first, with a composer.", zh: "全部评论按时间排序，底部输入。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          row({ en: "Jun · love this route!", zh: "阿军 · 这条路线太爱了！" }, lang, { icon: "person", icon2: "thumb_up", supporting: { en: "8 min ago", zh: "8 分钟前" } }),
          row({ en: "Kepler · what shoes are those?", zh: "开普勒 · 脚上是什么鞋？" }, lang, { icon: "person", icon2: "thumb_up", supporting: { en: "5 min ago", zh: "5 分钟前" } }),
          row({ en: "Ran · see you at the next one", zh: "阿然 · 下次带上我" }, lang, { icon: "person", icon2: "thumb_up", supporting: { en: "just now", zh: "刚刚" } }),
        ] },
        { id: nid("g"), x: 16, y: 700, axis: "x", items: [
          it("textField", { id: nid("ti"), label: c({ en: "Add a comment", zh: "写评论" }, lang), icon: null, variant: "filled", size: 316 }),
          it("iconButton", { id: nid("send"), label: "", icon: "send", variant: "filled" }),
        ] },
      ], { back: true });
      return assemble([s1, s2], zh ? "脉动" : "Pulse", zh ? "轻量图文社交应用。" : "A lightweight photo-and-text social app.", lang);
    },
  },
  {
    key: "shop",
    category: "commerce",
    device: "phone",
    nameKey: "tplShop",
    build: (lang) => {
      const zh = lang === "zh";
      const money = zh ? "¥" : "$";
      const s1 = screen("home", { en: "Shop", zh: "商城" }, { en: "Storefront: a campaign banner, categories, then product cards.", zh: "商城首页：活动位、分类与商品卡片。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [card({ en: "Autumn sale · up to 40% off", zh: "秋季大促 · 低至 6 折" }, { en: "Ends Sunday", zh: "周日结束" }, lang, { size2: 140 })] },
        { ...chipRow([{ en: "All", zh: "全部" }, { en: "Chairs", zh: "座椅" }, { en: "Lamps", zh: "灯具" }, { en: "Desks", zh: "书桌" }], lang), y: BODY_Y + 156 },
        { id: nid("g"), x: 16, y: BODY_Y + 204, axis: "y", items: [
          card({ en: `Oak work chair · ${money}129`, zh: `橡木工作椅 · ¥899` }, { en: "Ergonomic, solid oak", zh: "人体工学 · 实木橡木" }, lang, { size2: 168, to: "results" }),
          card({ en: `Paper lamp · ${money}45`, zh: `纸艺台灯 · ¥219` }, { en: "Warm diffused light", zh: "暖光漫射" }, lang, { size2: 168, to: "results" }),
        ] },
      ], { nav: nav([{ icon: "storefront", label: { en: "Shop", zh: "商城" } }, { icon: "favorite", label: { en: "Saved", zh: "收藏" }, to: "saved" }, { icon: "shopping_cart", label: { en: "Cart", zh: "购物车" }, to: "cart" }], lang, 0) });
      const s2 = screen("results", { en: "Chairs", zh: "座椅" }, { en: "Category results with filters.", zh: "分类结果与筛选。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          it("searchBar", { id: nid("sb"), label: c({ en: "Search chairs", zh: "搜索座椅" }, lang), icon: null, variant: "filled" }),
          it("chip", { id: nid("f1"), label: c({ en: "Under $150", zh: "¥1000 以内" }, lang), icon: "filter_list", variant: "filled" }),
        ] },
        { id: nid("g"), x: 16, y: BODY_Y + 152, axis: "y", items: [
          row({ en: "Oak work chair", zh: "橡木工作椅" }, lang, { icon: "chair", supporting: { en: zh ? "¥899 · 4.8 ★" : "$129 · 4.8 ★" }, icon2: "chevron_right" }),
          row({ en: "Lounge chair", zh: "休闲躺椅" }, lang, { icon: "chair", supporting: { en: zh ? "¥1,599 · 4.6 ★" : "$229 · 4.6 ★" }, icon2: "chevron_right" }),
          row({ en: "Stool", zh: "高脚凳" }, lang, { icon: "chair_alt", supporting: { en: zh ? "¥349 · 4.7 ★" : "$49 · 4.7 ★" }, icon2: "chevron_right" }),
        ] },
      ], { back: true });
      const s3 = screen("saved", { en: "Saved", zh: "收藏" }, { en: "Wishlist.", zh: "心愿单。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [row({ en: "Paper lamp", zh: "纸艺台灯" }, lang, { icon: "light", supporting: { en: zh ? "¥219" : "$45" } }), row({ en: "Cork board", zh: "软木板" }, lang, { icon: "push_pin", supporting: { en: zh ? "¥99" : "$19" } })] },
      ], { nav: nav([{ icon: "storefront", label: { en: "Shop", zh: "商城" }, to: "home" }, { icon: "favorite", label: { en: "Saved", zh: "收藏" } }, { icon: "shopping_cart", label: { en: "Cart", zh: "购物车" }, to: "cart" }], lang, 1) });
      const s4 = screen("cart", { en: "Cart", zh: "购物车" }, { en: "Cart summary, opens checkout.", zh: "购物车汇总，可去结算。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          row({ en: "Oak work chair × 1", zh: "橡木工作椅 × 1" }, lang, { icon: "chair", supporting: { en: zh ? "¥899" : "$129" } }),
          row({ en: "Paper lamp × 2", zh: "纸艺台灯 × 2" }, lang, { icon: "light", supporting: { en: zh ? "¥438" : "$90" } }),
          button({ en: "Checkout", zh: "去结算" }, lang, undefined, 380),
        ] },
      ]);
      return assemble([s1, s2, s3, s4], zh ? "集市" : "Marché", zh ? "家居用品电商应用。" : "A home-goods storefront app.", lang);
    },
  },
  {
    key: "product",
    category: "commerce",
    device: "phone",
    nameKey: "tplProduct",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("detail", { en: "Product", zh: "商品详情" }, { en: "One product: gallery, price, options and add to cart.", zh: "单品页：图库、价格、规格与加购。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          it("image", { id: nid("img"), label: "", icon: null, variant: "filled", size: 380, size2: 240 }),
          it("text", { id: nid("tt"), label: c({ en: "Oak work chair", zh: "橡木工作椅" }, lang), icon: null, variant: "filled", size: 26, bold: true }),
          it("text", { id: nid("tp"), label: c({ en: zh ? "¥899 · free shipping" : "$129 · free shipping" }, lang), icon: null, variant: "filled", size: 16 }),
          it("text", { id: nid("tr"), label: c({ en: "4.8 ★ · 312 reviews >", zh: "4.8 ★ · 312 条评价 >" }, lang), icon: null, variant: "filled", size: 14, action: { to: "reviews", transition: "slide" } }),
        ] },
        { ...chipRow([{ en: "Oak", zh: "橡木" }, { en: "Walnut", zh: "胡桃木" }, { en: "Ash", zh: "白蜡木" }], lang), y: BODY_Y + 384 },
        { id: nid("g"), x: 16, y: PHONE_H - NAV_H - 80, axis: "y", items: [button({ en: "Add to cart", zh: "加入购物车" }, lang, "back", 380)] },
      ], { back: true, nav: nav([{ icon: "storefront", label: { en: "Shop", zh: "商城" } }, { icon: "favorite", label: { en: "Saved", zh: "收藏" } }, { icon: "shopping_cart", label: { en: "Cart", zh: "购物车" } }], lang, 0) });
      const s2 = screen("reviews", { en: "Reviews", zh: "评价" }, { en: "Ratings and written reviews.", zh: "评分与文字评价。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          it("text", { id: nid("tt"), label: c({ en: "4.8 · 312 reviews", zh: "4.8 · 312 条评价" }, lang), icon: null, variant: "filled", size: 22, bold: true }),
          row({ en: "Sturdy and beautiful", zh: "结实又好看" }, lang, { icon: "star", supporting: { en: "Verified · Qi", zh: "已验证 · 小齐" }, icon2: null }),
          row({ en: "Assembly took 20 min", zh: "组装花了 20 分钟" }, lang, { icon: "star", supporting: { en: "Verified · Han", zh: "已验证 · 小韩" }, icon2: null }),
        ] },
      ], { back: true });
      return assemble([s1, s2], zh ? "集市" : "Marché", zh ? "家居用品电商应用。" : "A home-goods storefront app.", lang);
    },
  },
  {
    key: "cart",
    category: "commerce",
    device: "phone",
    nameKey: "tplCart",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("cart", { en: "Cart", zh: "购物车" }, { en: "Items, promo code, totals; the button starts checkout.", zh: "商品、优惠码与合计；按钮进入结算。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          row({ en: "Oak work chair × 1", zh: "橡木工作椅 × 1" }, lang, { icon: "chair", supporting: { en: zh ? "¥899" : "$129" }, icon2: "close" }),
          row({ en: "Paper lamp × 2", zh: "纸艺台灯 × 2" }, lang, { icon: "light", supporting: { en: zh ? "¥438" : "$90" }, icon2: "close" }),
          it("textField", { id: nid("promo"), label: c({ en: "Promo code", zh: "优惠码" }, lang), icon: null, variant: "outlined" }),
          it("text", { id: nid("sum"), label: c({ en: zh ? "Total ¥1,337" : "Total $219" }, lang), icon: null, variant: "filled", size: 22, bold: true }),
          button({ en: "Checkout", zh: "去结算" }, lang, "checkout", 380),
        ] },
      ], { back: true });
      const s2 = screen("checkout", { en: "Checkout", zh: "确认结算" }, { en: "Address, delivery and payment, then the order is placed.", zh: "地址、配送与支付，提交订单。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          field({ en: "Name", zh: "姓名" }, lang, "textField", "person"),
          field({ en: "Address", zh: "收货地址" }, lang, "textField", "location_on"),
          it("radio", { id: nid("d1"), label: c({ en: "Express · tomorrow", zh: "次日达 · 明天到" }, lang), icon: null, variant: "filled", checked: true }),
          it("radio", { id: nid("d2"), label: c({ en: "Standard · 3–5 days", zh: "标准 · 3–5 天" }, lang), icon: null, variant: "filled", checked: false }),
          it("select", { id: nid("pay"), label: c({ en: "Payment", zh: "支付方式" }, lang), icon: "credit_card", variant: "outlined", tabs: [{ icon: "", label: c({ en: "Card ending 4242", zh: "尾号 4242 的卡" }, lang) }, { icon: "", label: c({ en: "Cash on delivery", zh: "货到付款" }, lang) }] }),
          button({ en: "Place order", zh: "提交订单" }, lang, "back", 380),
        ] },
      ], { back: true });
      return assemble([s1, s2], zh ? "集市" : "Marché", zh ? "家居用品电商应用。" : "A home-goods storefront app.", lang);
    },
  },
  {
    key: "music",
    category: "media",
    device: "phone",
    nameKey: "tplMusic",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("library", { en: "Library", zh: "音乐库" }, { en: "Playlists first; a row opens the player.", zh: "歌单优先；点行进入播放页。" }, lang, [
        { id: nid("g"), x: 0, y: BAR_H, axis: "x", items: [it("tabs", { id: nid("tabs"), label: "", icon: null, variant: "filled", tabs: [{ icon: "", label: c({ en: "Playlists", zh: "歌单" }, lang) }, { icon: "", label: c({ en: "Artists", zh: "歌手" }, lang) }, { icon: "", label: c({ en: "Albums", zh: "专辑" }, lang) }], selected: 0 })] },
        rows(nid("g"), 16, BODY_Y + 48, [
          row({ en: "Deep Focus", zh: "深度专注" }, lang, { icon: "headphones", supporting: { en: "42 songs", zh: "42 首" }, to: "player", icon2: null }),
          row({ en: "Night Drive", zh: "夜间驾驶" }, lang, { icon: "directions_car", supporting: { en: "28 songs", zh: "28 首" }, to: "player", icon2: null }),
          row({ en: "Kitchen Jazz", zh: "厨房爵士" }, lang, { icon: "restaurant", supporting: { en: "16 songs", zh: "16 首" }, to: "player", icon2: null }),
        ]),
      ], { nav: nav([{ icon: "library_music", label: { en: "Library", zh: "音乐库" } }, { icon: "queue_music", label: { en: "Queue", zh: "队列" }, to: "queue" }], lang, 0) });
      const s2 = screen("player", { en: "Now playing", zh: "正在播放" }, { en: "Artwork, track controls and a seek bar.", zh: "封面、进度与播放控制。" }, lang, [
        { id: nid("g"), x: 46, y: BODY_Y + 8, axis: "x", items: [it("image", { id: nid("art"), label: "", icon: null, variant: "filled", size: 320, size2: 320 })] },
        { id: nid("g"), x: 16, y: BODY_Y + 376, axis: "y", items: [
          it("text", { id: nid("tt"), label: c({ en: "Slow Tide", zh: "慢潮" }, lang), icon: null, variant: "filled", size: 24, bold: true }),
          it("text", { id: nid("ta"), label: c({ en: "Cassia", zh: "卡西娅" }, lang), icon: null, variant: "filled", size: 15 }),
          it("slider", { id: nid("seek"), label: "", icon: null, variant: "filled", value: 40 }),
        ] },
        { id: nid("g"), x: 86, y: BODY_Y + 520, axis: "x", items: [
          it("iconButton", { id: nid("pv"), label: "", icon: "skip_previous", variant: "text", size: 64 }),
          it("iconButton", { id: nid("pp"), label: "", icon: "pause", variant: "filled", size: 76 }),
          it("iconButton", { id: nid("nx"), label: "", icon: "skip_next", variant: "text", size: 64 }),
        ] },
      ], { back: true, nav: nav([{ icon: "library_music", label: { en: "Library", zh: "音乐库" }, to: "library" }, { icon: "queue_music", label: { en: "Queue", zh: "队列" }, to: "queue" }], lang, 0) });
      const s3 = screen("queue", { en: "Queue", zh: "播放队列" }, { en: "What plays next.", zh: "接下来播放的内容。" }, lang, [
        rows(nid("g"), 16, BODY_Y, [
          row({ en: "Slow Tide — Cassia", zh: "慢潮 — 卡西娅" }, lang, { icon: "graphic_eq", icon2: null, supporting: { en: "3:58", zh: "3:58" } }),
          row({ en: "Glasshouse — Rêve", zh: "玻璃房 — Rêve" }, lang, { icon: "graphic_eq", icon2: null, supporting: { en: "4:12", zh: "4:12" } }),
          row({ en: "North Line — AOI", zh: "北线 — AOI" }, lang, { icon: "graphic_eq", icon2: null, supporting: { en: "2:47", zh: "2:47" } }),
        ]),
      ], { nav: nav([{ icon: "library_music", label: { en: "Library", zh: "音乐库" }, to: "library" }, { icon: "queue_music", label: { en: "Queue", zh: "队列" } }], lang, 1) });
      return assemble([s1, s2, s3], zh ? "浪声" : "Waves", zh ? "本地音乐播放器。" : "A local music player.", lang);
    },
  },
  {
    key: "weather",
    category: "media",
    device: "phone",
    nameKey: "tplWeather",
    build: (lang) => {
      const zh = lang === "zh";
      const deg = (t: number) => (zh ? `${t}°` : `${t}°`);
      const s1 = screen("today", { en: "Today", zh: "今天" }, { en: "Current conditions, the next hours and the week.", zh: "当前天气、逐小时与一周趋势。" }, lang, [
        { id: nid("g"), x: 106, y: BODY_Y + 8, axis: "y", items: [
          it("text", { id: nid("tmp"), label: c({ en: "23°", zh: "23°" }, lang), icon: null, variant: "filled", size: 72, bold: true }),
          it("text", { id: nid("cond"), label: c({ en: "Partly cloudy · Shanghai", zh: "多云转晴 · 上海" }, lang), icon: null, variant: "filled", size: 16 }),
        ] },
        { id: nid("g"), x: 16, y: BODY_Y + 208, axis: "x", items: ["10", "11", "12", "13", "14"].map((h, i) => it("box", { id: nid(`h${i}`), label: "", icon: null, variant: "filled", size: 64, size2: 88, radiusTop: 16, radiusBottom: 16, fill: "surfaceContainerLow" })) },
        { id: nid("g"), x: 30, y: BODY_Y + 224, axis: "x", items: ["10", "11", "12", "13", "14"].map((h, i) => it("text", { id: nid(`ht${i}`), label: deg(21 + i), icon: null, variant: "filled", size: 13 })) },
        rows(nid("g"), 16, BODY_Y + 344, [
          row({ en: "Tomorrow", zh: "明天" }, lang, { icon: "partly_cloudy_day", supporting: { en: "18–26°", zh: "18–26°" }, icon2: null }),
          row({ en: "Wednesday", zh: "周三" }, lang, { icon: "rainy", supporting: { en: "17–24°", zh: "17–24°" }, icon2: null }),
          row({ en: "Thursday", zh: "周四" }, lang, { icon: "sunny", supporting: { en: "19–27°", zh: "19–27°" }, icon2: null }),
        ]),
      ], { nav: nav([{ icon: "partly_cloudy_day", label: { en: "Today", zh: "今天" } }, { icon: "location_city", label: { en: "Cities", zh: "城市" }, to: "cities" }], lang, 0) });
      const s2 = screen("cities", { en: "Cities", zh: "城市" }, { en: "Saved cities with a glance of their weather.", zh: "已存城市与天气速览。" }, lang, [
        rows(nid("g"), 16, BODY_Y, [
          row({ en: "Shanghai · 23°", zh: "上海 · 23°" }, lang, { icon: "location_on", icon2: null, supporting: { en: "Partly cloudy", zh: "多云转晴" } }),
          row({ en: "Tokyo · 19°", zh: "东京 · 19°" }, lang, { icon: "location_on", icon2: null, supporting: { en: "Rain", zh: "雨" } }),
          row({ en: "Singapore · 31°", zh: "新加坡 · 31°" }, lang, { icon: "location_on", icon2: null, supporting: { en: "Thunderstorms", zh: "雷阵雨" } }),
        ]),
        { id: nid("g"), x: 340, y: PHONE_H - NAV_H - 88, axis: "x", items: [it("fab", { id: nid("fab"), label: "", icon: "add", variant: "filled" })] },
      ], { nav: nav([{ icon: "partly_cloudy_day", label: { en: "Today", zh: "今天" }, to: "today" }, { icon: "location_city", label: { en: "Cities", zh: "城市" } }], lang, 1) });
      return assemble([s1, s2], zh ? "观天" : "Skycast", zh ? "简洁的天气预报应用。" : "A calm weather forecast app.", lang);
    },
  },
  {
    key: "finance",
    category: "media",
    device: "phone",
    nameKey: "tplFinance",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("overview", { en: "Overview", zh: "总览" }, { en: "This month's balance and where it went.", zh: "本月余额与支出构成。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          it("card", { id: nid("bal"), label: c({ en: "Spent this month", zh: "本月支出" }, lang), supporting: c({ en: zh ? "¥3,482 of ¥5,000" : "$482 of $700" }, lang), icon: "savings", variant: "filled", size: 380, size2: 120, noImage: true } as Partial<Item>),
          it("linearProgress", { id: nid("pg"), label: "", icon: null, variant: "filled", value: 68 }),
        ] },
        rows(nid("g"), 16, BODY_Y + 224, [
          row({ en: "Food · ¥1,204", zh: "餐饮 · ¥1,204" }, lang, { icon: "restaurant", icon2: null, supporting: { en: "36%", zh: "36%" } }),
          row({ en: "Transport · ¥486", zh: "交通 · ¥486" }, lang, { icon: "commute", icon2: null, supporting: { en: "14%", zh: "14%" } }),
          row({ en: "Home · ¥990", zh: "居家 · ¥990" }, lang, { icon: "home", icon2: null, supporting: { en: "29%", zh: "29%" } }),
        ]),
        { id: nid("g"), x: 340, y: PHONE_H - NAV_H - 88, axis: "x", items: [it("fab", { id: nid("fab"), label: "", icon: "add", variant: "filled", action: { to: "new", transition: "slideUp" } })] },
      ], { nav: nav([{ icon: "pie_chart", label: { en: "Overview", zh: "总览" } }, { icon: "receipt_long", label: { en: "Records", zh: "流水" }, to: "records" }], lang, 0) });
      const s2 = screen("records", { en: "Records", zh: "流水" }, { en: "Every transaction, searchable.", zh: "全部交易，可搜索。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [it("searchBar", { id: nid("sb"), label: c({ en: "Search records", zh: "搜索流水" }, lang), icon: null, variant: "filled" })] },
        rows(nid("g"), 16, BODY_Y + 72, [
          row({ en: "Corner Bakery", zh: "街角面包房" }, lang, { icon: "bakery_dining", supporting: { en: zh ? "-¥28 · today" : "-$4 · today" }, icon2: null }),
          row({ en: "Metro card", zh: "地铁卡充值" }, lang, { icon: "directions_subway", supporting: { en: zh ? "-¥50 · yesterday" : "-$7 · yesterday" }, icon2: null }),
          row({ en: "Bookstore", zh: "书店" }, lang, { icon: "menu_book", supporting: { en: zh ? "-¥76 · Mon" : "-$11 · Mon" }, icon2: null }),
        ]),
      ], { nav: nav([{ icon: "pie_chart", label: { en: "Overview", zh: "总览" }, to: "overview" }, { icon: "receipt_long", label: { en: "Records", zh: "流水" } }], lang, 1) });
      const s3 = screen("new", { en: "New record", zh: "记一笔" }, { en: "A quick entry form: amount, category, note.", zh: "快速记账：金额、分类与备注。" }, lang, [
        { id: nid("g"), x: 16, y: BODY_Y, axis: "y", items: [
          field({ en: "Amount", zh: "金额" }, lang, "textField", "payments"),
          it("select", { id: nid("cat"), label: c({ en: "Category", zh: "分类" }, lang), icon: "category", variant: "outlined", tabs: [{ icon: "", label: c({ en: "Food", zh: "餐饮" }, lang) }, { icon: "", label: c({ en: "Transport", zh: "交通" }, lang) }, { icon: "", label: c({ en: "Home", zh: "居家" }, lang) }] }),
          field({ en: "Note", zh: "备注" }, lang, "textField", "sticky_note_2"),
          button({ en: "Save", zh: "保存" }, lang, "back", 380),
        ] },
      ], { back: true });
      return assemble([s1, s2, s3], zh ? "简账" : "Ledgerly", zh ? "个人记账与支出统计。" : "Personal expense tracking and stats.", lang);
    },
  },
  /* ---------- iOS set: the same flows rebuilt on the iPhone canvas with iOS parts ---------- */
  {
    key: "ios-signin",
    category: "account",
    device: "iphone",
    nameKey: "tplIosSignin",
    build: (lang) => {
      const zh = lang === "zh";
      const iosBar = (title: Copy, back = false): Item =>
        it("iosNavBar", {
          id: nid("nb"),
          label: c(title, lang),
          icon: back ? "chevron_left" : null,
          icon2: back ? null : "person_circle",
          ...(back ? { action: { to: "back" as const, transition: "slide" as const } } : {}),
        });
      const s1 = screen("ios-signin", { en: "Sign in", zh: "登录" }, { en: "iOS sign-in with grouped fields.", zh: "iOS 风格登录，分组输入。" }, lang, [
        { id: nid("g"), x: 16, y: 100, axis: "y", items: [iosBar({ en: "Sign in", zh: "登录" })] },
        { id: nid("g"), x: 16, y: 216, axis: "y", items: [field({ en: "Email", zh: "邮箱" }, lang, "textField", "mail"), field({ en: "Password", zh: "密码" }, lang, "textField", "lock")] },
        { id: nid("g"), x: 16, y: 372, axis: "y", items: [button({ en: "Sign in", zh: "登录" }, lang, "ios-signup", 361), it("text", { id: nid("t"), label: c({ en: "Forgot password?", zh: "忘记密码？" }, lang), icon: null, variant: "filled", size: 15, action: { to: "ios-signup", transition: "slide" } })] },
      ], { nav: it("iosTabBar", { id: nid("tb"), label: "", icon: null, variant: "filled", tabs: [{ icon: "login", label: c({ en: "Sign in", zh: "登录" }, lang) }, { icon: "person_add", label: c({ en: "Sign up", zh: "注册" }, lang) }], selected: 0, actions: { "tab:1": { to: "ios-signup", transition: "fade" } } }) });
      const s2 = screen("ios-signup", { en: "Sign up", zh: "注册" }, { en: "Create an account.", zh: "创建新账号。" }, lang, [
        { id: nid("g"), x: 16, y: 100, axis: "y", items: [iosBar({ en: "Sign up", zh: "注册" }, true)] },
        { id: nid("g"), x: 16, y: 216, axis: "y", items: [field({ en: "Nickname", zh: "昵称" }, lang, "textField", "person"), field({ en: "Email", zh: "邮箱" }, lang, "textField", "mail"), field({ en: "Password", zh: "密码" }, lang, "textField", "lock"), button({ en: "Create account", zh: "创建账号" }, lang, "back", 361)] },
      ]);
      return assemble([s1, s2], zh ? "花园记" : "Bloom", zh ? "照顾家中植物的提醒与日志应用（iOS 版）。" : "Care reminders and a journal for house plants, iOS edition.", lang, "iphone");
    },
  },
  {
    key: "ios-onboarding",
    category: "account",
    device: "iphone",
    nameKey: "tplIosOnboarding",
    build: (lang) => {
      const zh = lang === "zh";
      const seg = (i: number): Item =>
        it("iosSegment", { id: nid("sg"), label: "", icon: null, variant: "filled", tabs: [{ icon: "", label: c({ en: "Learn", zh: "学习" }, lang) }, { icon: "", label: c({ en: "Practice", zh: "练习" }, lang) }, { icon: "", label: c({ en: "Review", zh: "复习" }, lang) }], selected: i });
      const s1 = screen("o1", { en: "Welcome", zh: "欢迎" }, { en: "First launch.", zh: "首次启动。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [seg(0)] },
        { id: nid("g"), x: 120, y: 240, axis: "x", items: [it("box", { id: nid("bx"), label: "", icon: null, variant: "filled", size: 150, size2: 150, radiusTop: 40, radiusBottom: 40, fill: "primaryContainer" })] },
        { id: nid("g"), x: 16, y: 430, axis: "y", items: [text({ en: "Learn a little, every day", zh: "每天进步一点点" }, lang, 30, true), text({ en: "Five-minute lessons that fit your morning.", zh: "五分钟一课，装进你的清晨。" }, lang, 15)] },
        { id: nid("g"), x: 16, y: 600, axis: "y", items: [button({ en: "Next", zh: "下一步" }, lang, "o2", 361)] },
      ], { nav: it("iosTabBar", { id: nid("tb"), label: "", icon: null, variant: "filled", tabs: [{ icon: "house", label: c({ en: "Home", zh: "首页" }, lang) }, { icon: "chart_bar", label: c({ en: "Stats", zh: "统计" }, lang) }] }) });
      const s2 = screen("o2", { en: "Practice", zh: "练习" }, { en: "Turn on reminders and go.", zh: "打开提醒，开始吧。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [seg(1)] },
        { id: nid("g"), x: 16, y: 220, axis: "y", items: [
          it("iosList", { id: nid("ls"), label: "", icon: null, variant: "filled", tabs: [{ icon: "notifications", label: c({ en: "Daily reminder", zh: "每日提醒" }, lang), on: true }, { icon: "dark_mode", label: c({ en: "Dark mode", zh: "深色模式" }, lang), on: false }], size2: 132 }),
        ] },
        { id: nid("g"), x: 16, y: 600, axis: "y", items: [button({ en: "Get started", zh: "开始使用" }, lang, "back", 361)] },
      ], { back: true, nav: it("iosTabBar", { id: nid("tb"), label: "", icon: null, variant: "filled", tabs: [{ icon: "house", label: c({ en: "Home", zh: "首页" }, lang) }, { icon: "chart_bar", label: c({ en: "Stats", zh: "统计" }, lang) }] }) });
      return assemble([s1, s2], zh ? "句句学" : "Lingo", zh ? "碎片时间的语言学习应用（iOS 版）。" : "Bite-size language learning, iOS edition.", lang, "iphone");
    },
  },
  {
    key: "ios-feed",
    category: "social",
    device: "iphone",
    nameKey: "tplIosFeed",
    build: (lang) => {
      const zh = lang === "zh";
      const tb = (sel: 0 | 1, otherId: string): Item =>
        it("iosTabBar", {
          id: nid("tb"),
          label: "",
          icon: null,
          variant: "filled",
          tabs: [{ icon: "house", label: c({ en: "Home", zh: "首页" }, lang) }, { icon: "search", label: c({ en: "Search", zh: "搜索" }, lang) }, { icon: "person", label: c({ en: "Me", zh: "我的" }, lang) }],
          selected: sel,
          actions: { [`tab:${sel === 0 ? 1 : 0}`]: { to: otherId, transition: "fade" } },
        });
      const s1 = screen("if", { en: "Home", zh: "首页" }, { en: "iOS feed with a large-title bar.", zh: "iOS 大标题信息流。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Home", zh: "首页" }, lang), icon: null, icon2: null })] },
        { id: nid("g"), x: 16, y: 200, axis: "y", items: [
          card({ en: "Morning run along the river", zh: "清晨沿江跑步打卡" }, { en: "Mei · 12 min ago", zh: "阿梅 · 12 分钟前" }, lang, { size2: 200, to: "id" }),
          card({ en: "New espresso setup finally dialed in", zh: "新的意式咖啡机终于调好了" }, { en: "Kepler · 1 h ago", zh: "开普勒 · 1 小时前" }, lang, { size2: 200, to: "id" }),
        ] },
      ], { nav: tb(0, "is") });
      const s2 = screen("is", { en: "Search", zh: "搜索" }, { en: "iOS search over the feed.", zh: "iOS 风格搜索。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Search", zh: "搜索" }, lang), icon: null, icon2: null })] },
        { id: nid("g"), x: 16, y: 200, axis: "y", items: [
          it("iosSearch", { id: nid("se"), label: c({ en: "Search", zh: "搜索" }, lang), icon: null, variant: "filled" }),
          it("iosList", { id: nid("ls"), label: "", icon: null, variant: "filled", tabs: [{ icon: "tag", label: c({ en: "#film photography", zh: "#胶片摄影" }, lang) }, { icon: "tag", label: c({ en: "#city walks", zh: "#城市漫步" }, lang) }, { icon: "person", label: c({ en: "@kepler.cooks", zh: "@开普勒下厨" }, lang) }], size2: 176 }),
        ] },
      ], { nav: tb(1, "if") });
      const s3 = screen("id", { en: "Post", zh: "详情" }, { en: "A post with its comments.", zh: "动态与评论。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Post", zh: "详情" }, lang), icon: "chevron_left", icon2: null, action: { to: "back", transition: "slide" } })] },
        { id: nid("g"), x: 16, y: 200, axis: "y", items: [
          card({ en: "Morning run along the river", zh: "清晨沿江跑步打卡" }, { en: "6.2 km · 34 min", zh: "6.2 公里 · 34 分钟" }, lang, { size2: 180 }),
          it("iosList", { id: nid("ls"), label: "", icon: null, variant: "filled", tabs: [{ icon: "person", label: c({ en: "Jun: love this route!", zh: "阿军：这条路线太爱了！" }, lang) }, { icon: "person", label: c({ en: "Ran: see you next run", zh: "阿然：下次带上我" }, lang) }], size2: 132 }),
        ] },
      ], { back: true });
      return assemble([s1, s2, s3], zh ? "脉动" : "Pulse", zh ? "轻量图文社交应用（iOS 版）。" : "A lightweight social app, iOS edition.", lang, "iphone");
    },
  },
  {
    key: "ios-chat",
    category: "social",
    device: "iphone",
    nameKey: "tplIosChat",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("ic", { en: "Chats", zh: "会话" }, { en: "Conversations with an iOS search.", zh: "会话列表与 iOS 搜索。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Chats", zh: "会话" }, lang), icon: null, icon2: "square_and_pencil" })] },
        { id: nid("g"), x: 16, y: 208, axis: "y", items: [
          it("iosSearch", { id: nid("se"), label: c({ en: "Search", zh: "搜索" }, lang), icon: null, variant: "filled" }),
          it("iosList", { id: nid("ls"), label: "", icon: null, variant: "filled", tabs: [{ icon: "groups", label: c({ en: "Design review", zh: "设计评审群" }, lang) }, { icon: "person", label: c({ en: "Mom", zh: "妈妈" }, lang) }, { icon: "directions_run", label: c({ en: "Running club", zh: "跑团" }, lang) }], size2: 176 }),
        ] },
      ], { nav: it("iosTabBar", { id: nid("tb"), label: "", icon: null, variant: "filled", tabs: [{ icon: "chat_bubble", label: c({ en: "Chats", zh: "会话" }, lang) }, { icon: "archive", label: c({ en: "Archive", zh: "归档" }, lang) }] }) });
      const s2 = screen("room", { en: "Chat", zh: "聊天" }, { en: "Bubbles with a frosted toolbar.", zh: "消息气泡与毛玻璃工具栏。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Design review", zh: "设计评审群" }, lang), icon: "chevron_left", icon2: "video_call", action: { to: "back", transition: "slide" } })] },
        { id: nid("g"), x: 16, y: 220, axis: "y", items: [
          it("box", { id: nid("m1"), label: "", icon: null, variant: "filled", size: 220, size2: 44, radiusTop: 18, radiusBottom: 18, fill: "surfaceContainerHigh" }),
          it("box", { id: nid("m2"), label: "", icon: null, variant: "filled", size: 170, size2: 44, radiusTop: 18, radiusBottom: 18, fill: "primaryContainer" }),
        ] },
        { id: nid("g"), x: 26, y: 232, axis: "x", items: [it("text", { id: nid("t1"), label: c({ en: "See you at 6!", zh: "6 点见！" }, lang), icon: null, variant: "filled", size: 14 })] },
        { id: nid("g"), x: 200, y: 280, axis: "x", items: [it("text", { id: nid("t2"), label: c({ en: "Bringing mockups ☕", zh: "带原型图过去 ☕" }, lang), icon: null, variant: "filled", size: 14 })] },
        { id: nid("g"), x: 16, y: 700, axis: "x", items: [it("iosToolbar", { id: nid("tl"), label: "", icon: null, variant: "filled", tabs: [{ icon: "camera", label: "" }, { icon: "photo_library", label: "" }, { icon: "mic", label: "" }] })] },
      ], { back: true });
      return assemble([s1, s2], zh ? "回声" : "Echo", zh ? "熟人即时通讯（iOS 版）。" : "Instant messaging for close circles, iOS edition.", lang, "iphone");
    },
  },
  {
    key: "ios-music",
    category: "media",
    device: "iphone",
    nameKey: "tplIosMusic",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("im", { en: "Library", zh: "音乐库" }, { en: "Playlists with a segmented scope.", zh: "分段切换的歌单库。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Library", zh: "音乐库" }, lang), icon: null, icon2: null })] },
        { id: nid("g"), x: 16, y: 200, axis: "x", items: [it("iosSegment", { id: nid("sg"), label: "", icon: null, variant: "filled", tabs: [{ icon: "", label: c({ en: "Playlists", zh: "歌单" }, lang) }, { icon: "", label: c({ en: "Artists", zh: "歌手" }, lang) }, { icon: "", label: c({ en: "Albums", zh: "专辑" }, lang) }], selected: 0 })] },
        { id: nid("g"), x: 16, y: 260, axis: "y", items: [
          it("iosList", { id: nid("ls"), label: "", icon: null, variant: "filled", tabs: [{ icon: "headphones", label: c({ en: "Deep Focus", zh: "深度专注" }, lang) }, { icon: "directions_car", label: c({ en: "Night Drive", zh: "夜间驾驶" }, lang) }, { icon: "restaurant", label: c({ en: "Kitchen Jazz", zh: "厨房爵士" }, lang) }], size2: 176 }),
        ] },
      ], { nav: it("iosTabBar", { id: nid("tb"), label: "", icon: null, variant: "filled", tabs: [{ icon: "library_music", label: c({ en: "Library", zh: "音乐库" }, lang) }, { icon: "play_circle", label: c({ en: "Playing", zh: "播放" }, lang) }], selected: 0, actions: { "tab:1": { to: "now", transition: "slide" } } }) });
      const s2 = screen("now", { en: "Now playing", zh: "正在播放" }, { en: "Artwork and transport controls.", zh: "封面与播放控制。" }, lang, [
        { id: nid("g"), x: 36, y: 100, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Now playing", zh: "正在播放" }, lang), icon: "chevron_left", icon2: null, action: { to: "back", transition: "slide" } })] },
        { id: nid("g"), x: 46, y: 190, axis: "x", items: [it("image", { id: nid("art"), label: "", icon: null, variant: "filled", size: 300, size2: 300 })] },
        { id: nid("g"), x: 16, y: 516, axis: "y", items: [
          it("text", { id: nid("tt"), label: c({ en: "Slow Tide — Cassia", zh: "慢潮 — 卡西娅" }, lang), icon: null, variant: "filled", size: 20, bold: true }),
          it("slider", { id: nid("seek"), label: "", icon: null, variant: "filled", value: 40 }),
        ] },
        { id: nid("g"), x: 46, y: 640, axis: "x", items: [it("iosToolbar", { id: nid("tl"), label: "", icon: null, variant: "filled", tabs: [{ icon: "skip_previous", label: "" }, { icon: "pause_circle", label: "" }, { icon: "skip_next", label: "" }] })] },
      ], { back: true });
      return assemble([s1, s2], zh ? "浪声" : "Waves", zh ? "本地音乐播放器（iOS 版）。" : "A local music player, iOS edition.", lang, "iphone");
    },
  },
  {
    key: "ios-weather",
    category: "media",
    device: "iphone",
    nameKey: "tplIosWeather",
    build: (lang) => {
      const zh = lang === "zh";
      const s1 = screen("iw", { en: "Today", zh: "今天" }, { en: "Current conditions and the week.", zh: "当前天气与一周趋势。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "My location", zh: "所在城市" }, lang), icon: null, icon2: null })] },
        { id: nid("g"), x: 130, y: 180, axis: "y", items: [
          it("text", { id: nid("tmp"), label: c({ en: "23°", zh: "23°" }, lang), icon: null, variant: "filled", size: 68, bold: true }),
          it("text", { id: nid("cond"), label: c({ en: "Partly cloudy", zh: "多云转晴" }, lang), icon: null, variant: "filled", size: 15 }),
        ] },
        { id: nid("g"), x: 16, y: 400, axis: "y", items: [
          it("iosList", { id: nid("ls"), label: "", icon: null, variant: "filled", tabs: [{ icon: "partly_cloudy_day", label: c({ en: "Tomorrow · 18–26°", zh: "明天 · 18–26°" }, lang) }, { icon: "rainy", label: c({ en: "Wednesday · 17–24°", zh: "周三 · 17–24°" }, lang) }, { icon: "sunny", label: c({ en: "Thursday · 19–27°", zh: "周四 · 19–27°" }, lang) }], size2: 176 }),
        ] },
      ], { nav: it("iosTabBar", { id: nid("tb"), label: "", icon: null, variant: "filled", tabs: [{ icon: "partly_cloudy_day", label: c({ en: "Today", zh: "今天" }, lang) }, { icon: "map", label: c({ en: "Cities", zh: "城市" }, lang) }] }) });
      const s2 = screen("cities", { en: "Cities", zh: "城市" }, { en: "Saved cities.", zh: "已保存的城市。" }, lang, [
        { id: nid("g"), x: 16, y: 96, axis: "x", items: [it("iosNavBar", { id: nid("nb"), label: c({ en: "Cities", zh: "城市" }, lang), icon: "chevron_left", icon2: null, action: { to: "back", transition: "slide" } })] },
        { id: nid("g"), x: 16, y: 200, axis: "y", items: [
          it("iosSearch", { id: nid("se"), label: c({ en: "Search a city", zh: "搜索城市" }, lang), icon: null, variant: "filled" }),
          it("iosList", { id: nid("ls"), label: "", icon: null, variant: "filled", tabs: [{ icon: "location_on", label: c({ en: "Shanghai · 23°", zh: "上海 · 23°" }, lang) }, { icon: "location_on", label: c({ en: "Tokyo · 19°", zh: "东京 · 19°" }, lang) }, { icon: "location_on", label: c({ en: "Singapore · 31°", zh: "新加坡 · 31°" }, lang) }], size2: 176 }),
        ] },
      ], { back: true, nav: it("iosTabBar", { id: nid("tb"), label: "", icon: null, variant: "filled", tabs: [{ icon: "partly_cloudy_day", label: c({ en: "Today", zh: "今天" }, lang) }, { icon: "map", label: c({ en: "Cities", zh: "城市" }, lang) }], selected: 1, actions: { "tab:0": { to: "iw", transition: "fade" } } }) });
      return assemble([s1, s2], zh ? "观天" : "Skycast", zh ? "简洁的天气预报应用（iOS 版）。" : "A calm weather forecast app, iOS edition.", lang, "iphone");
    },
  },
  /* ---------- web set: 1440-wide pages from the existing parts ---------- */
  {
    key: "web-landing",
    category: "commerce",
    device: "web",
    nameKey: "tplWebLanding",
    build: (lang) => {
      const zh = lang === "zh";
      const M = 80;
      const s1: ScreenSpec = {
        id: "landing",
        name: { en: "Landing", zh: "落地页" },
        note: { en: "A product landing page: hero, features, call to action.", zh: "产品落地页：主视觉、特性与行动号召。" },
        parts: [
          { id: nid("g"), x: 0, y: 0, axis: "x", items: [it("topAppBar", { id: nid("bar"), label: c({ en: "Northbeam", zh: "北辰" }, lang), icon: null, icon2: null, variant: "filled", size: WEB_W })] },
          { id: nid("g"), x: M, y: 140, axis: "y", items: [
            text({ en: "Ship your docs as fast as you ship code", zh: "文档跟着代码一起发布" }, lang, 52, true),
            text({ en: "Northbeam turns your repository into a living knowledge base for the whole team.", zh: "北辰把代码仓库变成团队的知识库。" }, lang, 20),
          ] },
          { id: nid("g"), x: M, y: 380, axis: "x", items: [button({ en: "Start free", zh: "免费开始" }, lang, undefined, 220), button({ en: "Book a demo", zh: "预约演示" }, lang, undefined, 200)] },
          { id: nid("g"), x: M, y: 520, axis: "x", items: [0, 1, 2].map((i) => card([{ en: "Instant search", zh: "即刻搜索" }, { en: "Review flows", zh: "评审流" }, { en: "Access control", zh: "权限管理" }][i] as Copy, [{ en: "Answers in one keystroke.", zh: "一键即达的答案。" }, { en: "Docs review right in the PR.", zh: "在 PR 里完成文档评审。" }, { en: "SSO and fine-grained roles.", zh: "SSO 与细粒度角色。" }][i] as Copy, lang, { size2: 200 })) },
          { id: nid("g"), x: M, y: 780, axis: "x", items: [text({ en: "© 2026 Northbeam · Built with Knowhy Canvas", zh: "© 2026 北辰 · 用 Knowhy Canvas 制作" }, lang, 13)] },
        ],
      };
      return assemble([s1], zh ? "北辰" : "Northbeam", zh ? "开发者文档平台的官网落地页。" : "A landing page for a developer docs platform.", lang, "web");
    },
  },
  {
    key: "web-dashboard",
    category: "media",
    device: "web",
    nameKey: "tplWebDashboard",
    build: (lang) => {
      const zh = lang === "zh";
      const M = 64;
      const s1: ScreenSpec = {
        id: "dash",
        name: { en: "Dashboard", zh: "仪表盘" },
        note: { en: "An ops dashboard: KPIs, a trend area and recent activity.", zh: "运营仪表盘：指标、趋势与最近动态。" },
        parts: [
          { id: nid("g"), x: 0, y: 0, axis: "x", items: [it("topAppBar", { id: nid("bar"), label: c({ en: "Ops dashboard", zh: "运营仪表盘" }, lang), icon: "menu", icon2: "notifications", variant: "filled", size: WEB_W })] },
          { id: nid("g"), x: M, y: 128, axis: "x", items: [["Orders", "订单", "1,284"], ["Revenue", "收入", "¥86k"], ["Refunds", "退款", "32"], ["Latency", "延迟", "212ms"]].map(([en, zhL, v]) => it("card", { id: nid("kpi"), label: c({ en, zh: zhL }, lang), supporting: v, icon: "trending_up", variant: "filled", size: 300, size2: 140, noImage: true })) },
          { id: nid("g"), x: M, y: 320, axis: "x", items: [
            it("box", { id: nid("chart"), label: "", icon: null, variant: "filled", size: 880, size2: 380, radiusTop: 16, radiusBottom: 16, fill: "surfaceContainerLow" }),
            it("box", { id: nid("side"), label: "", icon: null, variant: "filled", size: 392, size2: 380, radiusTop: 16, radiusBottom: 16, fill: "surfaceContainerLow" }),
          ] },
          { id: nid("g"), x: 96, y: 350, axis: "x", items: [it("linearProgress", { id: nid("pg"), label: "", icon: null, variant: "filled", value: 64 })] },
          { id: nid("g"), x: M, y: 740, axis: "y", items: [
            it("listItem", { id: nid("r1"), label: c({ en: "Order #1042 shipped", zh: "订单 #1042 已发货" }, lang), supporting: c({ en: "2 min ago", zh: "2 分钟前" }, lang), icon: "local_shipping", icon2: null, variant: "filled" }),
            it("listItem", { id: nid("r2"), label: c({ en: "New team member joined", zh: "新成员加入团队" }, lang), supporting: c({ en: "1 h ago", zh: "1 小时前" }, lang), icon: "person_add", icon2: null, variant: "filled" }),
          ] },
        ],
      };
      return assemble([s1], zh ? "运营台" : "Console", zh ? "团队运营数据仪表盘（网页）。" : "A team operations dashboard for the web.", lang, "web");
    },
  },
  {
    key: "web-blog",
    category: "media",
    device: "web",
    nameKey: "tplWebBlog",
    build: (lang) => {
      const zh = lang === "zh";
      const M = 80;
      const s1: ScreenSpec = {
        id: "blog",
        name: { en: "Blog", zh: "博客" },
        note: { en: "A content site: featured story, article list and about column.", zh: "内容站：头条、文章列表与关于栏。" },
        parts: [
          { id: nid("g"), x: 0, y: 0, axis: "x", items: [it("topAppBar", { id: nid("bar"), label: c({ en: "Fieldnotes", zh: "田野笔记" }, lang), icon: null, icon2: "search", variant: "filled", size: WEB_W })] },
          { id: nid("g"), x: M, y: 120, axis: "x", items: [card({ en: "Designing for the edges of the network", zh: "为网络的边缘做设计" }, { en: "Featured · 12 min read", zh: "头条 · 12 分钟读完" }, lang, { size2: 300 })] },
          { id: nid("g"), x: M, y: 470, axis: "x", items: [
            it("card", { id: nid("a1"), label: c({ en: "What we learned rewriting the editor", zh: "重写编辑器的收获" }, lang), supporting: c({ en: "Engineering · 8 min", zh: "工程 · 8 分钟" }, lang), icon: "article", variant: "outlined", size: 620, size2: 170 }),
            it("card", { id: nid("a2"), label: c({ en: "A field guide to canvas performance", zh: "画布性能实地指南" }, lang), supporting: c({ en: "Engineering · 6 min", zh: "工程 · 6 分钟" }, lang), icon: "article", variant: "outlined", size: 620, size2: 170 }),
          ] },
          { id: nid("g"), x: 880, y: 470, axis: "y", items: [
            it("box", { id: nid("about"), label: "", icon: null, variant: "filled", size: 400, size2: 352, radiusTop: 16, radiusBottom: 16, fill: "surfaceContainerLow" }),
            it("text", { id: nid("ab"), label: c({ en: "About the team →", zh: "关于团队 →" }, lang), icon: null, variant: "filled", size: 15 }),
          ] },
        ],
      };
      return assemble([s1], zh ? "田野笔记" : "Fieldnotes", zh ? "工程团队的博客/内容站。" : "A blog and content site for an engineering team.", lang, "web");
    },
  },
  /* ---------- desktop set: macOS-style windows from the existing parts ---------- */
  {
    key: "desk-music",
    category: "media",
    device: "desktop",
    nameKey: "tplDeskMusic",
    build: (lang) => {
      const zh = lang === "zh";
      const s1: ScreenSpec = {
        id: "player",
        name: { en: "Player", zh: "播放器" },
        note: { en: "A desktop music player: rail navigation, album grid, player bar.", zh: "桌面音乐播放器：侧边导航、专辑网格与播放条。" },
        parts: [
          { id: nid("g"), x: 0, y: 0, axis: "y", items: [it("navRail", { id: nid("rail"), label: "", icon: null, variant: "filled", size2: 800, railExpanded: true, tabs: [{ icon: "library_music", label: c({ en: "Library", zh: "音乐库" }, lang) }, { icon: "album", label: c({ en: "Albums", zh: "专辑" }, lang) }, { icon: "favorite", label: c({ en: "Favorites", zh: "收藏" }, lang) }], selected: 0 })] },
          { id: nid("g"), x: 260, y: 56, axis: "y", items: [
            text({ en: "Good evening", zh: "晚上好" }, lang, 34, true),
            it("searchBar", { id: nid("sb"), label: c({ en: "Search your library", zh: "搜索音乐库" }, lang), icon: null, variant: "filled", size: 420 }),
          ] },
          { id: nid("g"), x: 260, y: 230, axis: "x", items: [0, 1, 2, 3].map((i) => it("card", { id: nid(`al${i}`), label: [["Deep Focus", "深度专注"], ["Night Drive", "夜间驾驶"], ["Kitchen Jazz", "厨房爵士"], ["Rainy Window", "雨窗"]][i][lang === "zh" ? 1 : 0], supporting: c({ en: `${16 + i * 6} songs`, zh: `${16 + i * 6} 首` }, lang), icon: "album", variant: "filled", size: 220, size2: 220 })) },
          { id: nid("g"), x: 260, y: 700, axis: "x", items: [
            it("box", { id: nid("pbar"), label: "", icon: null, variant: "filled", size: 960, size2: 72, radiusTop: 16, radiusBottom: 16, fill: "surfaceContainerHigh" }),
            it("text", { id: nid("now"), label: c({ en: "Slow Tide — Cassia", zh: "慢潮 — 卡西娅" }, lang), icon: null, variant: "filled", size: 14 }),
          ] },
          { id: nid("g"), x: 300, y: 722, axis: "x", items: [it("slider", { id: nid("seek"), label: "", icon: null, variant: "filled", value: 40, size: 400 })] },
        ],
      };
      return assemble([s1], zh ? "浪声桌面版" : "Waves Desktop", zh ? "桌面端音乐播放器（macOS 窗口）。" : "A desktop music player in a macOS window.", lang, "desktop");
    },
  },
  {
    key: "desk-settings",
    category: "account",
    device: "desktop",
    nameKey: "tplDeskSettings",
    build: (lang) => {
      const zh = lang === "zh";
      const s1: ScreenSpec = {
        id: "settings",
        name: { en: "Settings", zh: "设置中心" },
        note: { en: "A desktop settings center: sections on the rail, controls on the right.", zh: "桌面设置中心：侧栏分区，右侧控件。" },
        parts: [
          { id: nid("g"), x: 0, y: 0, axis: "y", items: [it("navRail", { id: nid("rail"), label: "", icon: null, variant: "filled", size2: 800, railExpanded: true, tabs: [{ icon: "person", label: c({ en: "Account", zh: "账号" }, lang) }, { icon: "palette", label: c({ en: "Appearance", zh: "外观" }, lang) }, { icon: "lock", label: c({ en: "Privacy", zh: "隐私" } , lang) }, { icon: "info", label: c({ en: "About", zh: "关于" }, lang) }], selected: 0 })] },
          { id: nid("g"), x: 280, y: 72, axis: "y", items: [
            text({ en: "Account settings", zh: "账号设置" }, lang, 30, true),
            it("switch", { id: nid("sw1"), label: c({ en: "Sync across devices", zh: "跨设备同步" }, lang), icon: null, variant: "filled", checked: true, size: 800 }),
            it("switch", { id: nid("sw2"), label: c({ en: "Show desktop notifications", zh: "显示桌面通知" }, lang), icon: null, variant: "filled", checked: false, size: 800 }),
            it("listItem", { id: nid("r1"), label: c({ en: "Language", zh: "语言" }, lang), supporting: c({ en: "Follow the system", zh: "跟随系统" }, lang), icon: "translate", icon2: "chevron_right", variant: "filled" }),
            it("listItem", { id: nid("r2"), label: c({ en: "Storage location", zh: "存储位置" }, lang), supporting: c({ en: "~/Library/Knowhy", zh: "~/Library/Knowhy" }, lang), icon: "folder", icon2: "folder_open", variant: "filled" }),
            it("listItem", { id: nid("r3"), label: c({ en: "Delete all local data", zh: "删除全部本地数据" }, lang), icon: "delete_forever", icon2: null, variant: "filled" }),
          ] },
        ],
      };
      return assemble([s1], zh ? "工作台" : "Workbench", zh ? "桌面端设置中心（macOS 窗口）。" : "A desktop settings center in a macOS window.", lang, "desktop");
    },
  },
];

/** the full document a template stands for: structure from the template, the author's palette and theme kept as they are */
export function buildTemplate(key: string, lang: Lang, keep: { paletteKey: string; customPalette?: Doc["customPalette"]; dynamicColor?: boolean; theme?: Doc["theme"] }): Doc {
  seq = 0;
  const def = TEMPLATES.find((t) => t.key === key);
  if (!def) throw new Error(`unknown template: ${key}`);
  const base = def.build(lang);
  const platform = def.device === "iphone" ? ("ios" as const) : def.device === "phone" ? ("android" as const) : ("web" as const);
  return {
    ...base,
    frame: "phone",
    platform,
    paletteKey: keep.paletteKey,
    ...(keep.customPalette ? { customPalette: keep.customPalette } : {}),
    ...(keep.dynamicColor ? { dynamicColor: keep.dynamicColor } : {}),
    ...(keep.theme ? { theme: keep.theme } : {}),
  };
}

/** the first screen of a template, for thumbnails: the frame and the groups that sit on it */
export function templateFirstScreen(key: string, lang: Lang): { frame: Frame; groups: Group[] } {
  seq = 0;
  const def = TEMPLATES.find((t) => t.key === key);
  if (!def) throw new Error(`unknown template: ${key}`);
  const base = def.build(lang);
  const frame = base.frames[0];
  return { frame, groups: base.groups };
}
