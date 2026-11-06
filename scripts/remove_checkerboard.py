#!/usr/bin/env python3
"""Convert generated JPG artwork with a fake checkerboard into PNG assets.

Uses only Pillow. Background pixels are flood-filled from each image edge so
interior artwork and its dark outlines are kept. Sprite sheets are split into
cells before removal, which avoids grid dividers trapping the fake backdrop.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import deque
from pathlib import Path
from typing import Any

try:
    from PIL import Image
except ImportError as exc:  # pragma: no cover - environment-specific message
    raise SystemExit("Pillow manque. Installe-le avec : python3 -m pip install Pillow") from exc


def clear_connected_checkerboard(image: Image.Image, chroma_tolerance: int) -> Image.Image:
    """Make neutral gray checkerboard pixels connected to an edge transparent."""
    rgba = image.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()
    visited = bytearray(width * height)
    queue: deque[int] = deque()

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return max(red, green, blue) - min(red, green, blue) <= chroma_tolerance and (
            red + green + blue
        ) // 3 >= 45

    def add_seed(x: int, y: int) -> None:
        index = y * width + x
        if not visited[index] and is_background(x, y):
            visited[index] = 1
            queue.append(index)

    for x in range(width):
        add_seed(x, 0)
        add_seed(x, height - 1)
    for y in range(height):
        add_seed(0, y)
        add_seed(width - 1, y)

    while queue:
        index = queue.popleft()
        x, y = index % width, index // width
        neighbors = []
        if x:
            neighbors.append(index - 1)
        if x + 1 < width:
            neighbors.append(index + 1)
        if y:
            neighbors.append(index - width)
        if y + 1 < height:
            neighbors.append(index + width)
        for neighbor in neighbors:
            nx, ny = neighbor % width, neighbor // width
            if not visited[neighbor] and is_background(nx, ny):
                visited[neighbor] = 1
                queue.append(neighbor)

    alpha = Image.new("L", rgba.size)
    alpha.putdata([0 if visited[index] else 255 for index in range(width * height)])
    # Zero RGB under fully transparent pixels: PNG compresses dramatically better,
    # and hidden checker colors cannot create a fringe when atlases are resized.
    rgb = Image.new("RGB", rgba.size, (0, 0, 0))
    rgb.paste(rgba.convert("RGB"), mask=alpha)
    rgb.putalpha(alpha)
    return rgb


def trim_transparent(image: Image.Image, padding: int = 3) -> Image.Image:
    """Recadre une illustration détourée sans rogner son contour ni ses lueurs."""
    bounds = image.getchannel("A").getbbox()
    if not bounds:
        return image
    left, top, right, bottom = bounds
    return image.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(image.width, right + padding),
        min(image.height, bottom + padding),
    ))


def process_asset(
    item: dict[str, Any], source_dir: Path, output_dir: Path
) -> list[Path]:
    source = source_dir / item["source"]
    output = output_dir / item["output"]
    output.parent.mkdir(parents=True, exist_ok=True)
    image = Image.open(source).convert("RGB")
    max_size = int(item["max_size"]) if item.get("max_size") else None

    def downscale(image_to_save: Image.Image) -> Image.Image:
        if max_size:
            image_to_save.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        return image_to_save

    if item.get("mode") == "texture":
        downscale(image).save(output, optimize=True)
        return [output]

    grid = item.get("grid")
    tolerance = int(item.get("chroma_tolerance", 24))
    if not grid:
        trimmed = trim_transparent(
            clear_connected_checkerboard(image, tolerance),
            int(item.get("transparent_padding", 3)),
        )
        downscale(trimmed).save(output, optimize=True)
        return [output]

    rows, columns = map(int, grid)
    width, height = image.size
    sheet = Image.new("RGBA", image.size, (0, 0, 0, 0))
    saved = []
    padding = int(item.get("cell_padding", 2))
    prefix = item["frame_prefix"]
    for row in range(rows):
        for column in range(columns):
            left = round(column * width / columns) + padding
            top = round(row * height / rows) + padding
            right = round((column + 1) * width / columns) - padding
            bottom = round((row + 1) * height / rows) - padding
            cell = clear_connected_checkerboard(image.crop((left, top, right, bottom)), tolerance)
            sheet.alpha_composite(cell, (left, top))

            bounds = cell.getchannel("A").getbbox()
            if bounds:
                frame = cell.crop(bounds)
                if rows == 1:
                    frame_name = f"{prefix}-{column + 1}.png"
                elif columns == 1:
                    frame_name = f"{prefix}-{row + 1}.png"
                else:
                    frame_name = f"{prefix}-r{row + 1}-c{column + 1}.png"
                frame_path = output_dir / frame_name
                frame.save(frame_path, optimize=True)
                saved.append(frame_path)

    sheet.save(output, optimize=True)
    return [output, *saved]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True, help="Manifeste JSON des images à convertir")
    parser.add_argument("--source-dir", type=Path, required=True, help="Dossier des images sources")
    parser.add_argument("--output-dir", type=Path, required=True, help="Dossier de sortie des PNG")
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    outputs = []
    for asset in manifest["assets"]:
        outputs.extend(process_asset(asset, args.source_dir, args.output_dir))
        print(f"Converti : {asset['source']}")
    print(f"Terminé : {len(outputs)} PNG dans {args.output_dir}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, KeyError, ValueError, json.JSONDecodeError) as error:
        print(f"Erreur : {error}", file=sys.stderr)
        raise SystemExit(1) from error
