// PNG export: renders the cover off-screen at the full post size and hands
// the browser a download. Nothing leaves the machine.

import { renderCover, SIZES } from "./cover.js";

export function renderExportCanvas(state) {
  const size = SIZES[state.size] || SIZES.square;
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  renderCover(ctx, state, size.w, size.h, { showSelection: false });
  return canvas;
}

export function downloadCoverPng(state) {
  const canvas = renderExportCanvas(state);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "vice-coast-cover.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, "image/png");
}
