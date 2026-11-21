// Vice Coast Cover Studio — editor wiring. Holds the cover state, loads the
// sample photos, binds every control, and handles panel selection, dragging
// and zooming on the preview canvas. Everything runs locally in the page.

import { renderCover, SIZES } from "./cover.js";
import { panelCount } from "./layouts.js";
import { downloadCoverPng } from "./export.js";

const SAMPLE_URLS = [
  "samples/boulevard.jpg",
  "samples/pier.jpg",
  "samples/marina.jpg",
  "samples/beachroad.jpg",
];

const state = {
  layout: "classic",
  size: "square",
  grade: "sunset",
  title: "SUNSET HEIST",
  subtitle: "A VICE COAST STORY",
  plate: "VI",
  photos: [],
  panels: [],
  selected: 0,
};

const canvas = document.getElementById("coverCanvas");
const ctx = canvas.getContext("2d");
const panelInfo = document.getElementById("panelInfo");
const zoomRange = document.getElementById("zoomRange");
const photoStrip = document.getElementById("photoStrip");
let lastRects = [];
let coverOnly = false;

function freshPanel(photoIndex) {
  return { photoIndex, zoom: 1, offsetX: 0, offsetY: 0 };
}

function ensurePanels() {
  const want = panelCount(state.layout);
  while (state.panels.length < want) {
    state.panels.push(freshPanel(state.panels.length % Math.max(1, state.photos.length)));
  }
  state.panels.length = want;
  if (state.selected >= want) state.selected = 0;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamples() {
  const loaded = [];
  for (const url of SAMPLE_URLS) {
    try {
      loaded.push(await loadImage(url));
    } catch (err) {
      console.warn("sample failed to load", url, err);
    }
  }
  if (loaded.length) {
    state.photos = loaded;
    state.panels = state.panels.map((panel, i) => ({ ...panel, photoIndex: i % loaded.length }));
  }
  ensurePanels();
  renderPhotoStrip();
  render();
}

function addPhotoFiles(files) {
  const images = [...files].filter((f) => f.type.startsWith("image/"));
  if (!images.length) return;
  Promise.all(images.map((f) => loadImage(URL.createObjectURL(f))))
    .then((loaded) => {
      const firstNew = state.photos.length;
      state.photos.push(...loaded);
      const panel = state.panels[state.selected];
      if (panel) panel.photoIndex = firstNew;
      renderPhotoStrip();
      render();
    })
    .catch((err) => console.warn("photo load failed", err));
}

function render() {
  const size = SIZES[state.size] || SIZES.square;
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  ensurePanels();
  lastRects = renderCover(ctx, state, size.w, size.h, { showSelection: !coverOnly });
  updatePanelInfo();
}

function updatePanelInfo() {
  const panel = state.panels[state.selected];
  const zoomPct = panel ? Math.round((panel.zoom || 1) * 100) : 100;
  panelInfo.textContent =
    `Panel ${state.selected + 1} of ${state.panels.length} · ` +
    `${state.photos.length} photo(s) loaded · zoom ${zoomPct}%`;
  if (panel && document.activeElement !== zoomRange) {
    zoomRange.value = String(Math.round((panel.zoom || 1) * 100));
  }
}

function renderPhotoStrip() {
  photoStrip.innerHTML = "";
  state.photos.forEach((img, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = `Use photo ${i + 1} in the selected panel`;
    const thumb = document.createElement("img");
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    btn.appendChild(thumb);
    btn.addEventListener("click", () => {
      const panel = state.panels[state.selected];
      if (panel) {
        panel.photoIndex = i;
        render();
      }
    });
    photoStrip.appendChild(btn);
  });
}

function bindSegmented(id, attr, apply) {
  const wrap = document.getElementById(id);
  wrap.querySelectorAll(".seg").forEach((btn) => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".seg").forEach((b) => b.classList.remove("is-on"));
      btn.classList.add("is-on");
      apply(btn.dataset[attr]);
      render();
    });
  });
}

function setSegmented(id, attr, value) {
  const wrap = document.getElementById(id);
  wrap.querySelectorAll(".seg").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset[attr] === value);
  });
}

function canvasPoint(event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) / box.width) * canvas.width,
    y: ((event.clientY - box.top) / box.height) * canvas.height,
  };
}

function panelAt(point) {
  for (let i = 0; i < lastRects.length; i++) {
    const r = lastRects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}

function panelSlack(panel, rect) {
  const img = state.photos[panel.photoIndex];
  if (!img) return { x: 0, y: 0 };
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (panel.zoom || 1);
  return {
    x: Math.max(0, img.naturalWidth * scale - rect.w),
    y: Math.max(0, img.naturalHeight * scale - rect.h),
  };
}

const clampOffset = (v) => Math.max(-0.5, Math.min(0.5, v));

let drag = null;

canvas.addEventListener("pointerdown", (event) => {
  const point = canvasPoint(event);
  const index = panelAt(point);
  if (index < 0) return;
  state.selected = index;
  const panel = state.panels[index];
  drag = {
    startX: point.x,
    startY: point.y,
    offsetX: panel.offsetX || 0,
    offsetY: panel.offsetY || 0,
    slack: panelSlack(panel, lastRects[index]),
  };
  canvas.setPointerCapture(event.pointerId);
  render();
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const panel = state.panels[state.selected];
  if (!panel) return;
  if (drag.slack.x > 0) panel.offsetX = clampOffset(drag.offsetX + (point.x - drag.startX) / drag.slack.x);
  if (drag.slack.y > 0) panel.offsetY = clampOffset(drag.offsetY + (point.y - drag.startY) / drag.slack.y);
  render();
});

canvas.addEventListener("pointerup", () => { drag = null; });
canvas.addEventListener("pointercancel", () => { drag = null; });

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const index = panelAt(canvasPoint(event));
  if (index < 0) return;
  state.selected = index;
  const panel = state.panels[index];
  const step = event.deltaY < 0 ? 0.08 : -0.08;
  panel.zoom = Math.max(1, Math.min(3, (panel.zoom || 1) + step));
  render();
}, { passive: false });

zoomRange.addEventListener("input", () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  panel.zoom = Number(zoomRange.value) / 100;
  render();
});

document.getElementById("nextPhotoBtn").addEventListener("click", () => {
  const panel = state.panels[state.selected];
  if (!panel || !state.photos.length) return;
  panel.photoIndex = (panel.photoIndex + 1) % state.photos.length;
  render();
});

document.getElementById("fillAllBtn").addEventListener("click", () => {
  const panel = state.panels[state.selected];
  if (!panel) return;
  state.panels.forEach((p) => { p.photoIndex = panel.photoIndex; });
  render();
});

const fileInput = document.getElementById("fileInput");
document.getElementById("addPhotosBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  addPhotoFiles(fileInput.files);
  fileInput.value = "";
});

document.getElementById("samplePhotosBtn").addEventListener("click", () => loadSamples());
document.getElementById("exportBtn").addEventListener("click", () => downloadCoverPng(state));

window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => {
  event.preventDefault();
  if (event.dataTransfer) addPhotoFiles(event.dataTransfer.files);
});

bindSegmented("layoutSeg", "layout", (value) => { state.layout = value; ensurePanels(); });
bindSegmented("sizeSeg", "size", (value) => { state.size = value; });
bindSegmented("gradeSeg", "grade", (value) => { state.grade = value; });

document.getElementById("titleInput").addEventListener("input", (e) => { state.title = e.target.value; render(); });
document.getElementById("subtitleInput").addEventListener("input", (e) => { state.subtitle = e.target.value; render(); });
document.getElementById("plateInput").addEventListener("input", (e) => { state.plate = e.target.value; render(); });

// Demo / screenshot states via URL parameters, e.g.
// ?layout=hero&grade=neon&size=wide&view=cover
function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const layout = params.get("layout");
  const grade = params.get("grade");
  const size = params.get("size");
  if (layout && ["classic", "hero", "triptych"].includes(layout)) {
    state.layout = layout;
    setSegmented("layoutSeg", "layout", layout);
  }
  if (grade && ["sunset", "neon", "clean"].includes(grade)) {
    state.grade = grade;
    setSegmented("gradeSeg", "grade", grade);
  }
  if (size && SIZES[size]) {
    state.size = size;
    setSegmented("sizeSeg", "size", size);
  }
  const title = params.get("title");
  const subtitle = params.get("subtitle");
  const plate = params.get("plate");
  if (title !== null) { state.title = title; document.getElementById("titleInput").value = title; }
  if (subtitle !== null) { state.subtitle = subtitle; document.getElementById("subtitleInput").value = subtitle; }
  if (plate !== null) { state.plate = plate; document.getElementById("plateInput").value = plate; }
  if (params.get("view") === "cover") {
    coverOnly = true;
    document.body.classList.add("cover-only");
  }
  ensurePanels();
}

applyUrlParams();
render();
loadSamples();
