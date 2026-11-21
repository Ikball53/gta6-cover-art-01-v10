#!/usr/bin/env python3
"""Take the entry's four screenshots with headless Chromium.

Serves app/ on a local port, renders each shot from shots.json at a window
size that matches the cover's aspect, then converts the PNG captures to
JPEGs inside the gate limits (long side <= 1280, each <= 256 KiB).
"""
import functools
import http.server
import json
import os
import subprocess
import sys
import threading

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP_DIR = os.path.join(ROOT, "app")
SHOTS_DIR = os.path.join(ROOT, "screenshots")
CHROME = os.path.expanduser(
    "~/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome"
)
PORT = 8973
MAX_BYTES = 262144
MAX_SIDE = 1280

WINDOW_SIZES = {
    "1-cover.jpg": (1080, 1080),
    "2-editor.jpg": (1280, 900),
    "3-cover-wide.jpg": (1280, 720),
    "4-cover-portrait.jpg": (880, 1100),
}


def serve_app():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=APP_DIR)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def capture(url, width, height, png_path):
    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--virtual-time-budget=15000",
        f"--window-size={width},{height}",
        f"--screenshot={png_path}",
        url,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0 or not os.path.exists(png_path):
        print(result.stdout[-2000:], result.stderr[-2000:], file=sys.stderr)
        raise RuntimeError(f"chromium capture failed for {url}")


def to_gate_jpeg(png_path, jpg_path):
    img = Image.open(png_path).convert("RGB")
    if max(img.size) > MAX_SIDE:
        img.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    for quality in (88, 82, 76, 70, 64, 58):
        img.save(jpg_path, "JPEG", quality=quality)
        if os.path.getsize(jpg_path) <= MAX_BYTES:
            break
    return img.size, os.path.getsize(jpg_path)


def main():
    with open(os.path.join(ROOT, "shots.json")) as fh:
        plan = json.load(fh)
    os.makedirs(SHOTS_DIR, exist_ok=True)
    httpd = serve_app()
    try:
        for shot in plan["shots"]:
            name = shot["file"]
            width, height = WINDOW_SIZES[name]
            url = f"http://127.0.0.1:{PORT}/{shot['url']}"
            png_path = os.path.join(SHOTS_DIR, name.replace(".jpg", ".png"))
            capture(url, width, height, png_path)
            size, nbytes = to_gate_jpeg(png_path, os.path.join(SHOTS_DIR, name))
            os.remove(png_path)
            print(f"{name}: {size[0]}x{size[1]} {nbytes} bytes")
    finally:
        httpd.shutdown()


if __name__ == "__main__":
    main()
