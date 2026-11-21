[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Ikball53/gta6-cover-art-01-v10/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Ikball53/gta6-cover-art-01-v10/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Vice Coast Cover Studio

A static web app that turns your own photos and a caption into multi-panel,
GTA-style cover art re-themed to the Vice Coast: classic grid, hero + duo and
triptych layouts, Vice sunset / neon night / clean colour grades, per-panel
crop, zoom and drag, bold caption lettering with a "VI" plate, and PNG export
at 1080 × 1080, 1080 × 1350 and 1920 × 1080.

Photos are read on your own machine and never uploaded. No game logos,
artwork or fonts are used; the lettering is drawn with system fonts.

## Run it

```
node serve.ts
```

then open http://localhost:8080 in a desktop browser. Or serve `app/` with
any static file server.

## Hand in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the kit's `buildDossier`.

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty.
