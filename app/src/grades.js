// Colour grades. Each grade is a canvas filter applied while the photo is
// drawn, plus a translucent gradient wash and a soft vignette painted over
// the panel afterwards. "Clean" keeps the photo almost untouched.

export const GRADES = {
  sunset: {
    label: "Vice sunset",
    filter: "saturate(1.35) contrast(1.08) brightness(1.03) sepia(0.22)",
    washTop: "rgba(255, 122, 61, 0.20)",
    washMid: "rgba(255, 61, 139, 0.12)",
    washBottom: "rgba(64, 16, 120, 0.22)",
    vignette: 0.34,
  },
  neon: {
    label: "Neon night",
    filter: "saturate(1.55) contrast(1.16) brightness(0.96) hue-rotate(-8deg)",
    washTop: "rgba(24, 200, 255, 0.16)",
    washMid: "rgba(120, 40, 220, 0.10)",
    washBottom: "rgba(255, 30, 160, 0.20)",
    vignette: 0.42,
  },
  clean: {
    label: "Clean",
    filter: "saturate(1.06) contrast(1.03)",
    washTop: "rgba(255, 255, 255, 0.00)",
    washMid: "rgba(255, 255, 255, 0.00)",
    washBottom: "rgba(10, 6, 24, 0.10)",
    vignette: 0.18,
  },
};

export function gradeFilter(gradeKey) {
  const grade = GRADES[gradeKey] || GRADES.sunset;
  return grade.filter;
}

// Paints the grade's gradient wash and vignette inside one panel rect.
export function paintGradeWash(ctx, rect, gradeKey) {
  const grade = GRADES[gradeKey] || GRADES.sunset;
  const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  wash.addColorStop(0, grade.washTop);
  wash.addColorStop(0.55, grade.washMid);
  wash.addColorStop(1, grade.washBottom);
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const radius = Math.max(rect.w, rect.h) * 0.72;
  const vig = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
  vig.addColorStop(0, "rgba(0, 0, 0, 0)");
  vig.addColorStop(1, `rgba(5, 2, 14, ${grade.vignette})`);
  ctx.fillStyle = vig;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}
