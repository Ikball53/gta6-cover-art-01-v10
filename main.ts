// Vice Coast Cover Studio — handoff program for make.fun's gta6-cover-art-01.
// It stages the static app and its screenshots into the output directory and
// writes the dossier the judge reads. Run twice by the grader; both runs must
// produce identical bytes, so nothing here depends on time or randomness.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { buildDossier } from "./vendor/makefun-app.ts";

const repoRoot = import.meta.dirname;
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "/output");

// Never stage into the repository itself: the copy would recurse into the
// source tree and the dossier would describe its own output.
if (outputDir === repoRoot || outputDir.startsWith(repoRoot + sep)) {
  throw new Error(`refusing to stage the entry inside its own repository: ${outputDir}`);
}

// The bounty's dossier caps: 160 KiB of source text, at most 4 screenshots of
// 256 KiB each, and the app tree bounded well under the grader's own limits.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

function clearStagedEntry(): void {
  mkdirSync(outputDir, { recursive: true });
  rmSync(join(outputDir, "app"), { recursive: true, force: true });
  rmSync(join(outputDir, "screenshots"), { recursive: true, force: true });
  rmSync(join(outputDir, "dossier.json"), { force: true });
}

function stageEntry(): void {
  clearStagedEntry();
  cpSync(join(repoRoot, "app"), join(outputDir, "app"), { recursive: true });
  cpSync(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });
  writeFileSync(join(outputDir, "dossier.json"), buildDossier(outputDir, DOSSIER_CAPS));
  console.log(`Vice Coast Cover Studio: dossier written to ${join(outputDir, "dossier.json")}`);
}

stageEntry();
