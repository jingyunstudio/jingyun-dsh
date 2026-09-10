#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Process multi-format icons and generate full-scale desktop application icons via Tauri CLI.
Supports: SVG, PNG, JPG/JPEG, WEBP, ICO, BMP, GIF, TIFF.
Handles non-square images by adding transparent padding to keep aspect ratio.
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

def ensure_pillow():
    """Ensure Pillow is installed."""
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("[Icon] Pillow not found. Attempting to install pillow...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "--quiet"])


def is_svg_file(file_path: str) -> bool:
    """Detect if file is an SVG by checking its content."""
    try:
        with open(file_path, "rb") as f:
            chunk = f.read(4096)
        text = chunk.decode("utf-8", errors="ignore").lower()
        if "<svg" in text and ("http://www.w3.org/2000/svg" in text or "</svg>" in text or "viewbox" in text):
            return True
        if text.strip().startswith("<?xml") and "<svg" in text:
            return True
    except Exception:
        pass
    return False


def extract_best_ico_frame(img):
    """Find and return the highest resolution frame in an ICO file."""
    best_frame = img
    max_dim = max(img.size)
    try:
        for i in range(100):
            img.seek(i)
            cur_w, cur_h = img.size
            if max(cur_w, cur_h) > max_dim:
                max_dim = max(cur_w, cur_h)
                best_frame = img.copy()
    except EOFError:
        pass
    return best_frame


def raster_to_square_png(input_path: str, output_path: str, min_size: int = 512):
    """Convert any raster image (PNG, JPG, WEBP, ICO, BMP, GIF) to a square PNG with alpha channel."""
    from PIL import Image

    with Image.open(input_path) as raw_img:
        # 1. Handle ICO multi-frames
        if raw_img.format == "ICO":
            img = extract_best_ico_frame(raw_img)
        else:
            img = raw_img.copy()

        # 2. Convert to RGBA
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        w, h = img.size

        # 3. If image is too small, upscale smoothly
        target_content_size = max(w, h)
        if target_content_size < min_size:
            scale = min_size / target_content_size
            new_w = max(1, int(round(w * scale)))
            new_h = max(1, int(round(h * scale)))
            resample_filter = getattr(Image, "Resampling", Image).LANCZOS
            img = img.resize((new_w, new_h), resample=resample_filter)
            w, h = img.size

        # 4. Make it perfectly square with transparent padding if needed
        canvas_dim = max(w, h, min_size)
        if w == canvas_dim and h == canvas_dim:
            square_img = img
        else:
            square_img = Image.new("RGBA", (canvas_dim, canvas_dim), (0, 0, 0, 0))
            offset_x = (canvas_dim - w) // 2
            offset_y = (canvas_dim - h) // 2
            square_img.paste(img, (offset_x, offset_y), img)

        square_img.save(output_path, format="PNG")
        print(f"[Icon] Converted raster image to square PNG ({canvas_dim}x{canvas_dim}) at {output_path}")


def run_tauri_icon(icon_file: str, output_dir: str = None, cwd: str = None):
    """Invoke tauri icon command to generate icons."""
    cwd = cwd or os.getcwd()

    base_args = ["tauri", "icon", icon_file]
    if output_dir:
        base_args.extend(["--output", output_dir])

    # Try pnpm first, then npx
    cli_candidates = [
        ["pnpm"] + base_args,
        ["npx", "--package", "@tauri-apps/cli"] + base_args,
        ["npx"] + base_args,
    ]

    last_error = None
    for cmd in cli_candidates:
        bin_name = cmd[0]
        bin_path = shutil.which(bin_name)
        if not bin_path:
            continue
        executable_cmd = [bin_path] + cmd[1:]
        try:
            print(f"[Icon] Running: {' '.join(executable_cmd)}")
            res = subprocess.run(
                executable_cmd,
                cwd=cwd,
                check=True,
                capture_output=True,
                text=True,
                shell=(sys.platform == "win32"),
            )
            print(res.stdout)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            last_error = e
            if isinstance(e, subprocess.CalledProcessError):
                print(f"[Icon] Command failed ({' '.join(executable_cmd)}): {e.stderr or e.stdout}")
            continue

    print(f"[Icon] Error: All tauri icon commands failed. Last error: {last_error}", file=sys.stderr)
    return False


def process_icon(source: str, output_dir: str = None, cwd: str = None) -> bool:
    """Download/read source icon, normalize to SVG or square PNG, and generate icons."""
    if not source or not source.strip():
        print("[Icon] No source icon provided. Skipping.")
        return True

    source = source.strip()
    temp_dir = tempfile.mkdtemp(prefix="dsh_icon_")
    downloaded_file = os.path.join(temp_dir, "raw_source")

    try:
        # Step 1: Obtain source file (download if URL, otherwise copy)
        if source.startswith("http://") or source.startswith("https://"):
            print(f"[Icon] Downloading logo from URL: {source}")
            req = urllib.request.Request(
                source,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp, open(downloaded_file, "wb") as out_file:
                shutil.copyfileobj(resp, out_file)
        else:
            if not os.path.exists(source):
                print(f"[Icon] Local file does not exist: {source}", file=sys.stderr)
                return False
            shutil.copyfile(source, downloaded_file)

        # Step 2: Check if file is SVG
        if is_svg_file(downloaded_file):
            print("[Icon] Detected SVG icon format.")
            icon_for_tauri = os.path.join(temp_dir, "logo.svg")
            shutil.copyfile(downloaded_file, icon_for_tauri)
        else:
            print("[Icon] Processing raster icon (PNG/JPG/WEBP/ICO/BMP/GIF)...")
            ensure_pillow()
            icon_for_tauri = os.path.join(temp_dir, "logo_square.png")
            raster_to_square_png(downloaded_file, icon_for_tauri)

        # Step 3: Run tauri icon
        success = run_tauri_icon(icon_for_tauri, output_dir=output_dir, cwd=cwd)
        if success:
            print("[Icon] Successfully generated multi-resolution desktop icons.")
        return success

    except Exception as ex:
        print(f"[Icon] Failed to process icon: {ex}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="Process multi-format icon for Tauri")
    parser.add_argument("source", help="Path or URL to source icon (SVG, PNG, JPG, WEBP, ICO, etc.)")
    parser.add_argument("--output", "-o", default=None, help="Output directory for generated icons (default: src-tauri/icons)")
    parser.add_argument("--cwd", default=None, help="Working directory (default: current working directory)")
    args = parser.parse_args()

    success = process_icon(args.source, output_dir=args.output, cwd=args.cwd)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
