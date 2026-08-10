(() => {
const FIELD_LIMITS = Object.freeze({
  community: 20, name: 14, role: 16, group: 18, tags: 24, tagline: 28,
  stampMain: 8, stampSub: 14, customMemberId: 18
});

const THEME_COLORS = Object.freeze({
  teal: '#116d71', blue: '#405bb9', purple: '#8353b4', pink: '#bc4d6c', orange: '#d2672a',
  gold: '#b28312', green: '#648b47', graphite: '#333438'
});

const DEFAULT_PROFILE = Object.freeze({
  community: 'WILD DREAM', name: '林晓', role: '内容共创者', group: '上海 · 周末组',
  tags: '摄影 / 城市漫游', tagline: '让兴趣找到同路人'
});

const TEMPLATES = Object.freeze({
  minimal: { label: '极简名片', note: '清晰、通用' },
  event: { label: '活动通行证', note: '醒目、有秩序' },
  editorial: { label: '编辑感拍立得', note: '松弛、有画面' }
});

const MATERIALS = Object.freeze({
  white: { label: '极简白', color: '#f7f6f2' },
  silver: { label: '银色金属', color: '#b9bcc0' },
  black: { label: '哑光黑', color: '#1d1d1b' },
  frosted: { label: '半透明磨砂', color: '#ddd9e4' }
});

const STAMP_OPTIONS = Object.freeze({
  colors: Object.freeze({ purple: '#76557f', pink: '#b8657d', blue: '#476f91', green: '#54725c', black: '#262523' }),
  shapes: Object.freeze(['circle', 'square', 'pill']),
  positions: Object.freeze(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
});

const required = ['community', 'name', 'role'];
const text = (value) => String(value ?? '').trim();

function validateProfile(input = {}) {
  const profile = {};
  for (const [field, limit] of Object.entries(FIELD_LIMITS)) {
    if (field.startsWith('stamp')) continue;
    profile[field] = text(input[field]).slice(0, limit);
  }
  const errors = {};
  for (const field of required) if (!profile[field]) errors[field] = '请填写此项';
  return { valid: Object.keys(errors).length === 0, errors, profile };
}

function createMemberId(random = Math.random) {
  const source = Math.floor(random() * 2176782336).toString(36).toUpperCase().padStart(6, '0').slice(0, 6);
  return `CM-${source}`;
}

function formatJoinDate(date = new Date()) {
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function safeExportFilename(profile) {
  const clean = (value, fallback) => text(value).replace(/[\\/:*?"<>|]+/g, '-').replace(/\.{2,}/g, '.').replace(/^\.+/, '').slice(0, 24) || fallback;
  return `${clean(profile?.community, '社群')}-${clean(profile?.name, '成员')}-电子工牌.png`;
}

function resolveMemberId(customMemberId, generatedMemberId) {
  return text(customMemberId).slice(0, FIELD_LIMITS.customMemberId) || generatedMemberId;
}

function resolveTheme(materialId, color) {
  const accent = /^#[0-9a-f]{6}$/i.test(String(color)) ? color : THEME_COLORS.teal;
  const tinted = materialId === 'white' || materialId === 'frosted';
  return { accent, tinted, ink: ['#d2672a', '#b28312'].includes(accent.toLowerCase()) ? '#1f1e1b' : '#ffffff' };
}


const minimumScale = (meta, frame) => Math.max(frame.width / meta.width, frame.height / meta.height);

function clampTransform(transform, meta, frame) {
  const scale = Math.max(Number(transform.scale) || 0, minimumScale(meta, frame));
  const maxX = Math.max(0, (meta.width * scale - frame.width) / 2);
  const maxY = Math.max(0, (meta.height * scale - frame.height) / 2);
  return {
    scale,
    x: Math.max(-maxX, Math.min(maxX, Number(transform.x) || 0)),
    y: Math.max(-maxY, Math.min(maxY, Number(transform.y) || 0))
  };
}

function fitCover(meta, frame) {
  return { scale: minimumScale(meta, frame), x: 0, y: 0 };
}

function zoomTransform(transform, delta, meta, frame) {
  const base = minimumScale(meta, frame);
  return clampTransform({ ...transform, scale: base * (1 + Math.max(0, Number(delta) || 0)) }, meta, frame);
}




const OUTPUT_SIZE = Object.freeze({ width: 1080, height: 1440 });
const VERTICAL_BADGE_LAYOUT = Object.freeze({
  orientation: 'portrait',
  holder: { x: 202, y: 266, width: 676, height: 956, radius: 38 },
  card: { x: 236, y: 300, width: 608, height: 888, radius: 13 }
});

const PHOTO_BOX = Object.freeze({ x: 278, y: 502, width: 524, height: 370 });
const DISPLAY_FONT = '900 64px "Avenir Next", "Helvetica Neue", sans-serif';
const BODY_FONT = '700 20px "Avenir Next", "PingFang SC", sans-serif';

function getBrandSlot(layout = VERTICAL_BADGE_LAYOUT) {
  return { x: layout.card.x + layout.card.width - 184, y: layout.card.y + 630, size: 112 };
}

function getIdentityLayout(layout = VERTICAL_BADGE_LAYOUT) {
  const { card } = layout;
  return {
    name: { x: card.x + 42, y: card.y + 638, width: 390, height: 56 },
    detail: { x: card.x + 42, y: card.y + 706, width: 524, height: 28 },
    footer: { x: card.x + 42, y: card.y + 810, width: 524, height: 28 }
  };
}

function getMaterialToken(materialId) {
  const tokens = {
    white: { id: 'white', frame: '#e8e4da', shadow: 'rgba(52,48,42,.16)' },
    silver: { id: 'silver', frame: '#abb0ae', shadow: 'rgba(48,52,51,.28)' },
    black: { id: 'black', frame: '#252624', shadow: 'rgba(0,0,0,.29)' },
    frosted: { id: 'frosted', frame: '#d7d9db', shadow: 'rgba(81,79,87,.2)' }
  };
  return tokens[materialId] || tokens.silver;
}

function getBrandMarkMode(model) {
  return model.brandMark === 'logo' ? 'logo' : 'stamp';
}

const rr = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
};

const fit = (ctx, value, width) => {
  const original = String(value || '');
  let output = original;
  while (output && ctx.measureText(output).width > width) output = output.slice(0, -1);
  return output === original ? output : `${output}…`;
};

function drawBackdrop(ctx) {
  ctx.fillStyle = '#f4efe5';
  ctx.fillRect(0, 0, OUTPUT_SIZE.width, OUTPUT_SIZE.height);
  ctx.fillStyle = 'rgba(130,116,96,.28)';
  for (let x = 42; x < OUTPUT_SIZE.width; x += 42) {
    for (let y = 44; y < OUTPUT_SIZE.height; y += 42) ctx.fillRect(x, y, 1, 1);
  }
  ctx.fillStyle = '#83796c';
  ctx.font = '700 15px ui-monospace, monospace';
  ctx.fillText('COMMUNITY BADGE', 78, 112);
}

function holderGradient(ctx, materialId, themeColor, holder) {
  const material = getMaterialToken(materialId);
  const theme = resolveTheme(materialId, themeColor);
  const gradient = ctx.createLinearGradient(holder.x, holder.y, holder.x + holder.width, holder.y + holder.height);
  if (material.id === 'silver') {
    gradient.addColorStop(0, '#656b6a');
    gradient.addColorStop(.14, '#f1f3ee');
    gradient.addColorStop(.32, '#9da3a0');
    gradient.addColorStop(.52, '#fafaf3');
    gradient.addColorStop(.72, '#979d9b');
    gradient.addColorStop(1, '#606665');
  } else if (material.id === 'black') {
    gradient.addColorStop(0, '#151614');
    gradient.addColorStop(.48, '#3a3b38');
    gradient.addColorStop(1, '#161715');
  } else if (material.id === 'frosted') {
    gradient.addColorStop(0, '#e8e9ea');
    gradient.addColorStop(.52, `${theme.accent}99`);
    gradient.addColorStop(1, '#f4f4f1');
  } else {
    gradient.addColorStop(0, '#fdfcf8');
    gradient.addColorStop(.52, theme.accent);
    gradient.addColorStop(1, '#f8f7f2');
  }
  return gradient;
}

function drawHolder(ctx, model) {
  const { holder } = VERTICAL_BADGE_LAYOUT;
  const material = getMaterialToken(model.materialId);
  ctx.save();
  ctx.shadowColor = material.shadow;
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 14;
  rr(ctx, holder.x, holder.y, holder.width, holder.height, holder.radius);
  ctx.fillStyle = holderGradient(ctx, model.materialId, model.themeColor, holder);
  ctx.fill();
  ctx.restore();
  rr(ctx, holder.x + 6, holder.y + 6, holder.width - 12, holder.height - 12, holder.radius - 5);
  ctx.strokeStyle = 'rgba(255,255,255,.72)';
  ctx.lineWidth = 2;
  ctx.stroke();
  rr(ctx, holder.x + 12, holder.y + 12, holder.width - 24, holder.height - 24, holder.radius - 10);
  ctx.strokeStyle = 'rgba(35,37,34,.38)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawPaperCard(ctx) {
  const { card } = VERTICAL_BADGE_LAYOUT;
  rr(ctx, card.x, card.y, card.width, card.height, card.radius);
  ctx.fillStyle = '#faf3e5';
  ctx.fill();
  ctx.strokeStyle = '#6d655a';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.save();
  rr(ctx, card.x + 10, card.y + 10, card.width - 20, card.height - 20, card.radius - 5);
  ctx.clip();
  ctx.fillStyle = 'rgba(125,108,87,.16)';
  for (let x = card.x + 13; x < card.x + card.width - 10; x += 10) {
    for (let y = card.y + 13; y < card.y + card.height - 10; y += 10) ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function drawPhoto(ctx, model) {
  const box = PHOTO_BOX;
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  ctx.fillStyle = '#b8bbb5';
  ctx.fillRect(box.x, box.y, box.width, box.height);
  if (model.photo && model.photoMeta && model.cropFrame) {
    const frame = model.cropFrame;
    const scale = Math.max(box.width / frame.width, box.height / frame.height);
    const width = model.photoMeta.width * model.crop.scale * scale;
    const height = model.photoMeta.height * model.crop.scale * scale;
    const x = box.x + box.width / 2 + model.crop.x * scale - width / 2;
    const y = box.y + box.height / 2 + model.crop.y * scale - height / 2;
    ctx.drawImage(model.photo, x, y, width, height);
  } else {
    ctx.fillStyle = '#f8f1e3';
    ctx.beginPath();
    ctx.arc(box.x + box.width / 2, box.y + box.height * .34, box.width * .13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(box.x + box.width / 2, box.y + box.height * .94, box.width * .3, box.height * .4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = '#332f29';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.fillStyle = 'rgba(250,243,229,.88)';
  ctx.font = '700 11px ui-monospace, monospace';
  ctx.fillText('MEMBER PHOTO', box.x + 10, box.y + box.height - 12);
}

function drawLogo(ctx, model, x, y, size) {
  if (model.logo) {
    const transform = model.logoTransform || {};
    const scale = Math.min(4, Math.max(.4, Number(transform.scale) || 1));
    const offsetX = Number(transform.x) || 0;
    const offsetY = Number(transform.y) || 0;
    const ratio = Math.min(size * .9 * scale / model.logo.naturalWidth, size * .9 * scale / model.logo.naturalHeight);
    const width = model.logo.naturalWidth * ratio;
    const height = model.logo.naturalHeight * ratio;
    ctx.drawImage(model.logo, x + (size - width) / 2 + offsetX, y + (size - height) / 2 + offsetY, width, height);
    return;
  }
  ctx.fillStyle = '#2c2b28';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#f8f0df';
  ctx.textAlign = 'center';
  ctx.font = '800 11px "Avenir Next", sans-serif';
  ctx.fillText('YOUR', x + size / 2, y + size * .38);
  ctx.font = '900 14px "Avenir Next", sans-serif';
  ctx.fillText('LOGO', x + size / 2, y + size * .57);
  ctx.fillStyle = '#d7cdbd';
  ctx.font = '700 7px ui-monospace, monospace';
  ctx.fillText('UPLOAD', x + size / 2, y + size * .77);
  ctx.textAlign = 'left';
}

function drawStamp(ctx, model, x, y, size) {
  const stamp = model.stamp || {};
  const color = /^#[0-9a-f]{6}$/i.test(stamp.color || '') ? stamp.color : STAMP_OPTIONS.colors.black;
  const shape = STAMP_OPTIONS.shapes.includes(stamp.shape) ? stamp.shape : 'square';
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (shape === 'pill') {
    rr(ctx, -size / 2, -size * .29, size, size * .58, size * .28);
    ctx.stroke();
  } else {
    ctx.strokeRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4);
  }
  ctx.textAlign = 'center';
  ctx.font = `900 ${size * .17}px "Avenir Next", sans-serif`;
  ctx.fillText(fit(ctx, String(stamp.main || 'MEMBER').toUpperCase(), size * .76), 0, -size * .06);
  ctx.font = `800 ${size * .1}px ui-monospace, monospace`;
  ctx.fillText(fit(ctx, String(stamp.sub || 'CLUB').toUpperCase(), size * .76), 0, size * .16);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawCommunityName(ctx, profile) {
  const { card } = VERTICAL_BADGE_LAYOUT;
  ctx.fillStyle = '#26231f';
  ctx.font = DISPLAY_FONT;
  ctx.fillText(fit(ctx, profile.community, card.width - 84), card.x + 42, card.y + 116);
}

function drawIdentityStrip(ctx, model) {
  const identity = getIdentityLayout();
  const brand = getBrandSlot();
  ctx.fillStyle = '#27231f';
  ctx.font = '900 48px "Avenir Next", "PingFang SC", sans-serif';
  ctx.fillText(fit(ctx, model.profile.name, identity.name.width), identity.name.x, identity.name.y + 40);
  if (getBrandMarkMode(model) === 'logo') drawLogo(ctx, model, brand.x, brand.y, brand.size);
  else drawStamp(ctx, model, brand.x, brand.y, brand.size);
  ctx.fillStyle = '#504a41';
  ctx.font = BODY_FONT;
  const role = fit(ctx, model.profile.role, 220);
  const group = fit(ctx, model.profile.group || model.profile.tags, 230);
  ctx.fillText(`${role}  /  ${group}`, identity.detail.x, identity.detail.y + 20);
}

function drawFooter(ctx, model) {
  const footer = getIdentityLayout().footer;
  ctx.strokeStyle = '#9f9280';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(footer.x, footer.y - 10);
  ctx.lineTo(footer.x + footer.width, footer.y - 10);
  ctx.stroke();
  ctx.fillStyle = '#554e45';
  ctx.font = '700 17px "Avenir Next", "PingFang SC", sans-serif';
  ctx.fillText(fit(ctx, model.profile.tagline, footer.width - 196), footer.x, footer.y + 14);
  ctx.fillStyle = '#665c50';
  ctx.font = '700 13px ui-monospace, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`MEMBER ID  ${fit(ctx, model.memberId, 118)}`, footer.x + footer.width, footer.y + 14);
  ctx.textAlign = 'left';
}

function renderBadge(canvas, model) {
  canvas.width = OUTPUT_SIZE.width;
  canvas.height = OUTPUT_SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建工牌画布');
  drawBackdrop(ctx);
  drawHolder(ctx, model);
  drawPaperCard(ctx);
  drawCommunityName(ctx, model.profile);
  drawPhoto(ctx, model);
  drawIdentityStrip(ctx, model);
  drawFooter(ctx, model);
  return canvas;
}



const app = document.querySelector('#app');
const cropFrame = { width: 524, height: 370 };
const defaultStamp = () => ({ main: 'MEMBER', sub: 'CLUB', color: STAMP_OPTIONS.colors.black, shape: 'square' });
const freshState = () => ({
  profile: { ...DEFAULT_PROFILE, customMemberId: '' },
  materialId: 'silver',
  themeColor: THEME_COLORS.graphite,
  brandMark: 'logo',
  stamp: defaultStamp(),
  memberIdMode: 'random',
  taglineMode: 'personal',
  memberId: createMemberId(),
  photo: null,
  photoUrl: '',
  photoMeta: null,
  logo: null,
  logoUrl: '',
  logoTransform: { scale: 1, x: 0, y: 0 },
  crop: { scale: 1, x: 0, y: 0 },
  errors: {},
  status: '所有内容仅在当前浏览器中处理，不会上传。',
  exporting: false
});

const state = freshState();
const esc = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function field(key, label) {
  const value = state.profile[key] || '';
  return `<label class="field"><span>${label}<small>${value.length}/${FIELD_LIMITS[key]}</small></span><input data-field="${key}" maxlength="${FIELD_LIMITS[key]}" value="${esc(value)}" aria-invalid="${Boolean(state.errors[key])}" />${state.errors[key] ? `<em>${esc(state.errors[key])}</em>` : ''}</label>`;
}

function stampField(key, label) {
  const stampKey = key === 'stampMain' ? 'main' : 'sub';
  const value = state.stamp[stampKey] || '';
  const limit = FIELD_LIMITS[key];
  return `<label class="field"><span>${label}<small>${value.length}/${limit}</small></span><input data-stamp-field="${key}" maxlength="${limit}" value="${esc(value)}" /></label>`;
}

function materialChoices() {
  return Object.entries(MATERIALS).map(([id, material]) => `<button type="button" class="choice ${state.materialId === id ? 'is-selected' : ''}" data-action="material" data-value="${id}" aria-pressed="${state.materialId === id}"><span class="choice-mark material-mark material-mark--${id}"></span><span><strong>${material.label}</strong><small>${id === 'white' || id === 'frosted' ? '可换组织色' : '保留原材质'}</small></span><b>${state.materialId === id ? '✓' : ''}</b></button>`).join('');
}

function brandChoices() {
  const logoSelected = state.brandMark === 'logo';
  return `<div class="choice-grid brand-choice-grid"><button type="button" class="choice ${logoSelected ? 'is-selected' : ''}" data-action="brand-mark" data-value="logo" aria-pressed="${logoSelected}"><span class="choice-mark brand-mark brand-mark--logo"></span><span><strong>选择社区 Logo</strong><small>显示在成员身份区右侧</small></span><b>${logoSelected ? '✓' : ''}</b></button><button type="button" class="choice ${!logoSelected ? 'is-selected' : ''}" data-action="brand-mark" data-value="stamp" aria-pressed="${!logoSelected}"><span class="choice-mark brand-mark brand-mark--stamp"></span><span><strong>使用 DIY 印章</strong><small>与 Logo 占同一位置</small></span><b>${!logoSelected ? '✓' : ''}</b></button></div>`;
}

function brandEditor() {
  if (state.brandMark === 'logo') return `<div class="brand-editor"><div class="brand-upload"><label class="upload-button">${state.logoUrl ? '更换社区 Logo' : '上传社区 Logo'}<input id="logo-input" type="file" accept="image/*" /></label><span>${state.logoUrl ? '已载入，可自由调整大小与位置。' : '支持常见图片格式，仅在当前浏览器中处理。'}</span></div>${state.logoUrl ? `<div class="logo-tools"><label class="logo-size-control">Logo 大小<input id="logo-scale" type="range" min="40" max="400" value="${Math.round(state.logoTransform.scale * 100)}" /></label><div class="logo-direction"><span>Logo 位置</span><div class="direction-pad"><button type="button" class="logo-pad-up" data-action="logo-nudge" data-x="0" data-y="-12" aria-label="Logo 上移">↑</button><button type="button" class="logo-pad-left" data-action="logo-nudge" data-x="-12" data-y="0" aria-label="Logo 左移">←</button><i aria-hidden="true">+</i><button type="button" class="logo-pad-right" data-action="logo-nudge" data-x="12" data-y="0" aria-label="Logo 右移">→</button><button type="button" class="logo-pad-down" data-action="logo-nudge" data-x="0" data-y="12" aria-label="Logo 下移">↓</button></div></div></div>` : ''}</div>`;
  return `<div class="stamp-editor"><div class="form-grid stamp-grid">${stampField('stampMain', '印章主文字')}${stampField('stampSub', '印章附文')}</div><div class="stamp-options"><label>印章颜色<input id="stamp-color" type="color" value="${state.stamp.color}" aria-label="选择印章颜色" /></label><div><span>印章轮廓</span>${STAMP_OPTIONS.shapes.map((shape) => `<button type="button" class="mini-choice ${state.stamp.shape === shape ? 'is-selected' : ''}" data-action="stamp-shape" data-value="${shape}">${({ circle: '圆章', square: '方章', pill: '长章' })[shape]}</button>`).join('')}</div></div></div>`;
}

function memberIdEditor() {
  const isCustom = state.memberIdMode === 'custom';
  return `<div class="mode-row"><button type="button" class="mode-choice ${!isCustom ? 'is-selected' : ''}" data-action="member-id-mode" data-value="random" aria-pressed="${!isCustom}"><strong>随机生成编号</strong><small>${state.memberId}</small></button><button type="button" class="mode-choice ${isCustom ? 'is-selected' : ''}" data-action="member-id-mode" data-value="custom" aria-pressed="${isCustom}"><strong>自定义填写</strong><small>按组织规则填写</small></button></div>${isCustom ? `<div class="single-field">${field('customMemberId', '成员编号')}</div>` : `<button type="button" class="text-action" data-action="refresh-member-id">换一个随机编号</button>`}`;
}

function taglineEditor() {
  const personal = state.taglineMode === 'personal';
  return `<div class="tagline-editor"><div class="mode-row"><button type="button" class="mode-choice ${personal ? 'is-selected' : ''}" data-action="tagline-mode" data-value="personal" aria-pressed="${personal}"><strong>个人一句话</strong><small>展示成员自己的表达</small></button><button type="button" class="mode-choice ${!personal ? 'is-selected' : ''}" data-action="tagline-mode" data-value="community" aria-pressed="${!personal}"><strong>社区口号</strong><small>展示组织的共同主张</small></button></div><div class="single-field">${field('tagline', personal ? '个人一句话' : '社区口号')}</div></div>`;
}

function render() {
  app.innerHTML = `<header class="site-head"><a class="wordmark" href="#top"><i></i> COMMUNITY BADGE</a><p>本地制作 · 高清导出 · 不上传资料</p></header><section class="intro" id="top"><p class="eyebrow">COMMUNITY BADGE STUDIO</p><h1>为每位成员，生成一张可分享的电子工牌。</h1><p>左侧填写资料，右侧实时预览。适合各种社区使用，可填写资料，选择风格，一键生成可分享的电子工牌。</p></section><div class="workspace"><section class="panel editor"><details open><summary>选择卡套</summary><div class="choice-grid">${materialChoices()}</div><div class="theme-panel"><div><strong>组织主题色</strong><small>银色与黑色保留材质；白色与磨砂可使用组织色。</small></div><input id="theme-color" type="color" value="${state.themeColor}" aria-label="选择组织主题色" /><div class="swatches">${Object.values(THEME_COLORS).map((color) => `<button type="button" aria-label="选择 ${color}" data-action="theme" data-value="${color}" style="background:${color}" class="${state.themeColor === color ? 'is-selected' : ''}"></button>`).join('')}</div></div></details><details open><summary>品牌标识</summary>${brandChoices()}${brandEditor()}</details><details open><summary>成员资料</summary><div class="form-grid">${field('community', '社群名称')}${field('name', '成员昵称')}${field('role', '社群角色')}${field('group', '地区 / 分组')}${field('tags', '个人标签')}</div></details><details open><summary>编号与一句话</summary><div class="settings-stack">${memberIdEditor()}${taglineEditor()}</div></details><details open><summary>头像照片</summary><div class="photo-row"><label class="upload-button">${state.photoUrl ? '更换照片' : '选择本地照片'}<input id="photo-input" type="file" accept="image/*" /></label><span>${state.photoUrl ? '已载入，可调整构图' : '支持常见图片格式'}</span></div><div class="photo-tools ${state.photoUrl ? '' : 'is-hidden'}"><label>缩放<input id="zoom-input" type="range" min="0" max="100" value="0" /></label><div><button type="button" data-action="nudge" data-x="-18" data-y="0">←</button><button type="button" data-action="nudge" data-x="18" data-y="0">→</button><button type="button" data-action="nudge" data-x="0" data-y="-18">↑</button><button type="button" data-action="nudge" data-x="0" data-y="18">↓</button></div></div></details></section><aside class="preview-panel"><div class="preview-head"><div><span>实时预览</span><strong>竖版社群工牌</strong></div><button type="button" data-action="reset">恢复示例</button></div><div class="canvas-shell"><canvas id="badge-canvas" aria-label="社群电子工牌预览"></canvas></div><div class="export-card"><button type="button" class="export-button" data-action="export" ${state.exporting ? 'disabled' : ''}><span>${state.exporting ? '正在生成…' : '一键导出 PNG'}</span><b>↗</b></button><p class="status" role="status">${esc(state.status)}</p></div></aside></div><footer><span>COMMUNITY BADGE</span><p>生成内容仅用于社群展示，不作为真实身份证明或通行凭证。</p></footer>`;
  bind();
  draw();
}

function model() {
  return {
    ...state,
    memberId: state.memberIdMode === 'custom' ? resolveMemberId(state.profile.customMemberId, state.memberId) : state.memberId,
    cropFrame
  };
}

function draw() {
  const canvas = document.querySelector('#badge-canvas');
  if (canvas) renderBadge(canvas, model());
}

function bind() {
  document.querySelector('#photo-input')?.addEventListener('change', (event) => setPhoto(event.target.files?.[0]));
  document.querySelector('#logo-input')?.addEventListener('change', (event) => setLogo(event.target.files?.[0]));
  document.querySelector('#logo-scale')?.addEventListener('input', (event) => {
    state.logoTransform.scale = Number(event.target.value) / 100;
    draw();
  });
  document.querySelectorAll('[data-action="logo-nudge"]').forEach((button) => button.addEventListener('click', () => {
    state.logoTransform.x += Number(button.dataset.x);
    state.logoTransform.y += Number(button.dataset.y);
    draw();
  }));
  document.querySelector('#zoom-input')?.addEventListener('input', (event) => {
    if (!state.photoMeta) return;
    state.crop = zoomTransform(fitCover(state.photoMeta, cropFrame), Number(event.target.value) / 50, state.photoMeta, cropFrame);
    draw();
  });
}

function loadImage(file, onLoad, onError) {
  if (!file || !file.type.startsWith('image/')) {
    onError('请选择一张可读取的图片。');
    return;
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => onLoad(image, url);
  image.onerror = () => {
    URL.revokeObjectURL(url);
    onError('图片读取失败，请换一张重试。');
  };
  image.src = url;
}

function setPhoto(file) {
  loadImage(file, (image, url) => {
    if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
    state.photo = image;
    state.photoUrl = url;
    state.photoMeta = { width: image.naturalWidth, height: image.naturalHeight };
    state.crop = fitCover(state.photoMeta, cropFrame);
    state.status = '照片已载入，所有处理均在本地完成。';
    render();
  }, (status) => {
    state.status = status;
    render();
  });
}

function setLogo(file) {
  loadImage(file, (image, url) => {
    if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
    state.logo = image;
    state.logoUrl = url;
    state.logoTransform = { scale: 1, x: 0, y: 0 };
    state.status = '社区 Logo 已载入，将显示在身份区右侧。';
    render();
  }, (status) => {
    state.status = status;
    render();
  });
}

async function exportPng() {
  const valid = validateProfile(state.profile);
  if (!valid.valid) {
    state.errors = valid.errors;
    state.status = '请先补全社群名称、成员昵称和社群角色。';
    render();
    return;
  }
  state.profile = { ...state.profile, ...valid.profile };
  state.exporting = true;
  render();
  const canvas = document.querySelector('#badge-canvas');
  try {
    const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG 生成失败')), 'image/png'));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeExportFilename(state.profile);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.status = 'PNG 已导出。';
  } catch {
    state.status = '导出失败，请重试；内容已保留。';
  }
  state.exporting = false;
  render();
}

function reset() {
  if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
  if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
  Object.assign(state, freshState(), { status: '已恢复默认示例。' });
  render();
}

app.addEventListener('input', (event) => {
  if (event.target.dataset.field) {
    const key = event.target.dataset.field;
    state.profile[key] = event.target.value.slice(0, FIELD_LIMITS[key]);
    delete state.errors[key];
    draw();
  }
  if (event.target.dataset.stampField) {
    const key = event.target.dataset.stampField;
    state.stamp[key === 'stampMain' ? 'main' : 'sub'] = event.target.value.slice(0, FIELD_LIMITS[key]);
    draw();
  }
});

app.addEventListener('change', (event) => {
  if (event.target.id === 'theme-color') {
    state.themeColor = event.target.value;
    draw();
  }
  if (event.target.id === 'stamp-color') {
    state.stamp.color = event.target.value;
    draw();
  }
});

app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const { action, value } = button.dataset;
  if (action === 'material') {
    state.materialId = value;
    render();
  }
  if (action === 'theme') {
    state.themeColor = value;
    render();
  }
  if (action === 'brand-mark') {
    state.brandMark = value;
    render();
  }
  if (action === 'stamp-shape') {
    state.stamp.shape = value;
    render();
  }
  if (action === 'member-id-mode') {
    state.memberIdMode = value;
    render();
  }
  if (action === 'refresh-member-id') {
    state.memberId = createMemberId();
    render();
  }
  if (action === 'tagline-mode') {
    state.taglineMode = value;
    render();
  }
  if (action === 'nudge' && state.photoMeta) {
    state.crop.x += Number(button.dataset.x);
    state.crop.y += Number(button.dataset.y);
    draw();
  }
  if (action === 'export') exportPng();
  if (action === 'reset') reset();
});

window.addEventListener('beforeunload', () => {
  if (state.photoUrl) URL.revokeObjectURL(state.photoUrl);
  if (state.logoUrl) URL.revokeObjectURL(state.logoUrl);
});

render();

})();
