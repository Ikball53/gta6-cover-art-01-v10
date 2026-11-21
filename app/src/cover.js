// The cover renderer: draws the multi-panel collage, the colour grade, the
// caption band with bold lettering and the plate badge onto any canvas at
// any size. The editor preview and the PNG export share this one path, so
// what you see is exactly what you get.

import { panelRects } from "./layouts.js";
import { gradeFilter, paintGradeWash } from "./grades.js";

export const SIZES = {
  square: { w: 1080, h: 1080, label: "1080 × 1080" },
  portrait: { w: 1080, h: 1350, label: "1080 × 1350" },
  wide: { w: 1920, h: 1080, label: "1920 × 1080" },
};

const TITLE_FONT = '"Arial Black", "Liberation Sans", "Helvetica Neue", Arial, sans-serif';
const BODY_FONT = '"Helvetica Neue", "Liberation Sans", Arial, sans-serif';

let noiseTile = null;

function makeNoiseTile() {
  const tile = document.createElement("canvas");
  tile.width = 180;
  tile.height = 180;
  const tctx = tile.getContext("2d");
  const data = tctx.createImageData(tile.width, tile.height);
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  tctx.putImageData(data, 0, 0);
  return tile;
}

function captionBandHeight(H) {
  return Math.round(Math.min(260, Math.max(170, H * 0.198)));
}

export function photoArea(W, H) {
  const band = captionBandHeight(H);
  const margin = Math.max(6, Math.round(W * 0.0075));
  return { x: margin, y: margin, w: W - margin * 2, h: H - band - margin, band };
}

function drawPanelPhoto(ctx, img, rect, panel, gradeKey) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    grad.addColorStop(0, "#3a1c6e");
    grad.addColorStop(1, "#160a33");
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = "rgba(244, 238, 248, 0.65)";
    ctx.font = `700 ${Math.max(15, rect.w * 0.045)}px ${BODY_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ADD A PHOTO", rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.restore();
    return;
  }
  const zoom = Math.max(1, panel.zoom || 1);
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const slackX = Math.max(0, dw - rect.w);
  const slackY = Math.max(0, dh - rect.h);
  const dx = rect.x - slackX / 2 + (panel.offsetX || 0) * slackX;
  const dy = rect.y - slackY / 2 + (panel.offsetY || 0) * slackY;
  ctx.filter = gradeFilter(gradeKey);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = "none";
  paintGradeWash(ctx, rect, gradeKey);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitTitleSize(ctx, text, maxWidth, startPx) {
  let px = startPx;
  while (px > 24) {
    ctx.font = `italic 900 ${px}px ${TITLE_FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 4;
  }
  return px;
}

function drawCaptionBand(ctx, W, H, band, state) {
  const bandY = H - band;
  const bandGrad = ctx.createLinearGradient(0, bandY, 0, H);
  bandGrad.addColorStop(0, "#150a33");
  bandGrad.addColorStop(1, "#070313");
  ctx.fillStyle = bandGrad;
  ctx.fillRect(0, bandY, W, band);

  // amber rule along the top of the band
  ctx.fillStyle = "#ffb340";
  ctx.fillRect(0, bandY, W, Math.max(3, Math.round(H * 0.004)));

  const plateText = (state.plate || "VI").toUpperCase();
  const platePx = Math.round(band * 0.34);
  ctx.font = `900 ${platePx}px ${TITLE_FONT}`;
  const plateTextW = ctx.measureText(plateText).width;
  const plateW = plateTextW + platePx * 0.9;
  const plateH = platePx * 1.45;
  const plateX = W - plateW - W * 0.045;
  const plateY = bandY - plateH * 0.32;

  const title = (state.title || "").toUpperCase();
  const subtitle = (state.subtitle || "").toUpperCase();
  const titleBudget = plateX - W * 0.05 - W * 0.03;
  const titlePx = fitTitleSize(ctx, title || " ", titleBudget, Math.round(band * 0.42));
  const titleY = bandY + band * 0.52;

  ctx.save();
  ctx.translate(W * 0.05, titleY);
  ctx.transform(1, 0, -0.07, 1, 0, 0);
  ctx.font = `italic 900 ${titlePx}px ${TITLE_FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  // coral offset shadow, dark outline, cream face
  ctx.fillStyle = "#ff6b5e";
  ctx.fillText(title, titlePx * 0.05, titlePx * 0.05);
  ctx.strokeStyle = "#160a2e";
  ctx.lineWidth = titlePx * 0.17;
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = "#fff6e8";
  ctx.fillText(title, 0, 0);
  ctx.restore();

  if (subtitle) {
    const subPx = Math.max(15, Math.round(band * 0.115));
    ctx.font = `700 ${subPx}px ${BODY_FONT}`;
    try { ctx.letterSpacing = `${Math.round(subPx * 0.42)}px`; } catch (e) { /* older canvas */ }
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#2ee6c8";
    ctx.fillText(subtitle, W * 0.052, bandY + band * 0.82);
    try { ctx.letterSpacing = "0px"; } catch (e) { /* ignore */ }
  }

  // plate badge, overlapping the band's top edge like a sticker
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = platePx * 0.22;
  ctx.shadowOffsetY = platePx * 0.06;
  const plateGrad = ctx.createLinearGradient(plateX, plateY, plateX, plateY + plateH);
  plateGrad.addColorStop(0, "#ffc95e");
  plateGrad.addColorStop(1, "#ff9d2e");
  roundRectPath(ctx, plateX, plateY, plateW, plateH, plateH * 0.18);
  ctx.fillStyle = plateGrad;
  ctx.fill();
  ctx.restore();
  ctx.font = `900 ${platePx}px ${TITLE_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#24103f";
  ctx.fillText(plateText, plateX + plateW / 2, plateY + plateH / 2 + platePx * 0.04);
}

// Renders the whole cover. opts.showSelection draws the editor's highlight
// around the selected panel; exports leave it off.
export function renderCover(ctx, state, W, H, opts = {}) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0a0618";
  ctx.fillRect(0, 0, W, H);

  const area = photoArea(W, H);
  const scale = W / 1080;
  const rects = panelRects(state.layout, area, scale);

  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photoIndex: 0, zoom: 1, offsetX: 0, offsetY: 0 };
    const img = state.photos[panel.photoIndex] || null;
    drawPanelPhoto(ctx, img, rect, panel, state.grade);
    ctx.strokeStyle = "rgba(4, 2, 10, 0.9)";
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    if (opts.showSelection && i === state.selected) {
      ctx.strokeStyle = "#2ee6c8";
      ctx.lineWidth = Math.max(3, 5 * scale);
      ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
    }
  });

  // film grain over the photo area only
  if (!noiseTile) noiseTile = makeNoiseTile();
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.globalAlpha = 0.05;
  const pattern = ctx.createPattern(noiseTile, "repeat");
  ctx.fillStyle = pattern;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.restore();

  drawCaptionBand(ctx, W, H, area.band, state);
  return rects;
}
