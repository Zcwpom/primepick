#!/usr/bin/env python3
"""
把 record-demo.mjs 抓下来的帧合成 GIF

用法:
  python scripts/frames-to-gif.py --frames <帧目录> --out docs/demo.gif
  python scripts/frames-to-gif.py --frames <帧目录> --out docs/demo.gif --width 900 --colors 128

为什么单独用 Python：GIF 需要调色板量化与逐帧时长控制，Pillow 几行就能做完；
Node 侧要做同样的事得再引一个图片库，为一个演示资源不值得。
"""
import argparse
import json
import os

from PIL import Image

RESAMPLING = getattr(Image, "Resampling", Image).LANCZOS


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", required=True, help="包含 frames.json 与 *.jpg 的目录")
    parser.add_argument("--out", required=True, help="输出 GIF 路径")
    parser.add_argument("--width", type=int, default=900, help="GIF 宽度（等比缩放）")
    parser.add_argument("--colors", type=int, default=128, help="调色板颜色数，越少体积越小")
    parser.add_argument("--min-ms", type=int, default=70, help="单帧最短停留")
    parser.add_argument("--max-ms", type=int, default=500, help="单帧最长停留（去掉长时间静止）")
    parser.add_argument("--tail-ms", type=int, default=1400, help="最后一帧停留时间")
    args = parser.parse_args()

    meta_path = os.path.join(args.frames, "frames.json")
    with open(meta_path, encoding="utf-8") as handle:
        meta = json.load(handle)
    frames = meta["frames"]
    if not frames:
        raise SystemExit("没有可用帧，先跑 node scripts/record-demo.mjs")

    src_w, src_h = meta["width"], meta["height"]
    width = min(args.width, src_w)
    height = round(src_h * width / src_w)

    # 每帧的显示时长 = 与下一帧的时间差，再做上下限截断（长时间静止不占满 GIF）
    durations = []
    for index, frame in enumerate(frames):
        delta = (frames[index + 1]["t"] - frame["t"]) if index + 1 < len(frames) else args.tail_ms
        durations.append(max(args.min_ms, min(args.max_ms, delta)))
    durations[-1] = args.tail_ms

    # 全局统一调色板：拿第一帧量化出的 palette 给所有帧用，
    # 逐帧自适应会让同一种颜色在相邻帧之间抖动，肉眼看起来就是"闪"
    first = Image.open(os.path.join(args.frames, frames[0]["file"])).convert("RGB")
    first = first.resize((width, height), RESAMPLING)
    palette = first.convert("P", palette=Image.ADAPTIVE, colors=args.colors)

    images = [first.quantize(palette=palette, dither=Image.FLOYDSTEINBERG)]
    for frame in frames[1:]:
        image = Image.open(os.path.join(args.frames, frame["file"])).convert("RGB")
        image = image.resize((width, height), RESAMPLING)
        images.append(image.quantize(palette=palette, dither=Image.FLOYDSTEINBERG))

    out_dir = os.path.dirname(args.out)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    images[0].save(
        args.out,
        save_all=True,
        append_images=images[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )

    size = os.path.getsize(args.out)
    total = sum(durations) / 1000
    # 只用 ASCII 打印：Windows 控制台默认 GBK，非 ASCII 字符（如 ✓）会直接抛 UnicodeEncodeError
    print(f"[OK] {args.out}: {len(images)} frames, {width}x{height}, {size / 1024:.0f} kB, {total:.1f}s")


if __name__ == "__main__":
    main()
