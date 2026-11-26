"""Tool tạo mã QR từ đường link.

Cách dùng:
    python create_qr.py https://example.com
    python create_qr.py https://example.com -o ma_qr.png
    python create_qr.py            # chạy rồi nhập link khi được hỏi
"""
import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

import qrcode
from qrcode.constants import ERROR_CORRECT_M

OUTPUT_DIR = Path(__file__).parent / "output"


def default_filename(link: str) -> str:
    """Tạo tên file từ link, ví dụ: example.com_20261126_101530.png"""
    name = re.sub(r"^https?://", "", link)
    name = re.sub(r"[^\w.-]+", "_", name).strip("_")[:50] or "qr"
    return f"{name}_{datetime.now():%Y%m%d_%H%M%S}.png"


def make_qr_image(link: str, box_size: int = 10, border: int = 4, fill_color: str = "black",
                  back_color: str = "white"):
    """Tạo ảnh QR (PIL Image) từ link."""
    qr = qrcode.QRCode(
        version=None,  # tự chọn kích thước phù hợp với độ dài link
        error_correction=ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(link)
    qr.make(fit=True)
    return qr.make_image(fill_color=fill_color, back_color=back_color).convert("RGB")


def create_qr(link: str, output: Path, box_size: int = 10, border: int = 4) -> Path:
    img = make_qr_image(link, box_size=box_size, border=border)
    output.parent.mkdir(parents=True, exist_ok=True)
    img.save(output)
    return output


def main() -> int:
    # Tránh lỗi hiển thị tiếng Việt trên một số terminal Windows
    sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Tạo mã QR từ đường link.")
    parser.add_argument("link", nargs="?", help="Đường link cần tạo mã QR")
    parser.add_argument("-o", "--output", help="Đường dẫn file PNG xuất ra")
    parser.add_argument("--size", type=int, default=10, help="Kích thước mỗi ô (mặc định 10)")
    args = parser.parse_args()

    link = args.link or input("Nhập đường link: ").strip()
    if not link:
        print("Lỗi: chưa nhập đường link.", file=sys.stderr)
        return 1

    output = Path(args.output) if args.output else OUTPUT_DIR / default_filename(link)
    path = create_qr(link, output, box_size=args.size)
    print(f"Đã tạo mã QR: {path.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
