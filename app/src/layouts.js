// Panel geometry for the three cover layouts. Every layout fills the photo
// area above the caption band with panels separated by thin dark gutters, in
// the spirit of classic multi-panel box art.

export const LAYOUTS = {
  classic: { label: "Classic grid", panels: 4 },
  hero: { label: "Hero + duo", panels: 3 },
  triptych: { label: "Triptych", panels: 3 },
};

const GUTTER = 10; // px between panels at full export size, scaled by caller

function gridRects(area, cols, rows, gutter) {
  const rects = [];
  const cellW = (area.w - gutter * (cols - 1)) / cols;
  const cellH = (area.h - gutter * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: area.x + c * (cellW + gutter),
        y: area.y + r * (cellH + gutter),
        w: cellW,
        h: cellH,
      });
    }
  }
  return rects;
}

function heroRects(area, gutter) {
  const heroW = Math.round(area.w * 0.58);
  const sideW = area.w - heroW - gutter;
  const sideH = (area.h - gutter) / 2;
  return [
    { x: area.x, y: area.y, w: heroW, h: area.h },
    { x: area.x + heroW + gutter, y: area.y, w: sideW, h: sideH },
    { x: area.x + heroW + gutter, y: area.y + sideH + gutter, w: sideW, h: sideH },
  ];
}

function triptychRects(area, gutter) {
  return gridRects(area, 3, 1, gutter);
}

// area: {x, y, w, h} of the photo region. scale: export width / 1080, so the
// gutters stay proportional at every post size.
export function panelRects(layout, area, scale) {
  const gutter = Math.max(4, Math.round(GUTTER * scale));
  if (layout === "hero") return heroRects(area, gutter);
  if (layout === "triptych") return triptychRects(area, gutter);
  return gridRects(area, 2, 2, gutter);
}

export function panelCount(layout) {
  return LAYOUTS[layout] ? LAYOUTS[layout].panels : 4;
}
