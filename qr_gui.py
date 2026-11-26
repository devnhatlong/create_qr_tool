"""Giao diện tạo mã QR từ đường link.

Chạy: python qr_gui.py
"""
import tkinter as tk
from tkinter import colorchooser, filedialog

import customtkinter as ctk
from PIL import Image

from create_qr import OUTPUT_DIR, default_filename, make_qr_image

PREVIEW_SIZE = 280
ACCENT = "#4F46E5"        # tím indigo
ACCENT_HOVER = "#4338CA"
CARD = ("#FFFFFF", "#1F2937")
BG = ("#F3F4F6", "#111827")
MUTED = ("#6B7280", "#9CA3AF")
BORDER = ("#E5E7EB", "#374151")


class QRApp(ctk.CTk):
    def __init__(self):
        super().__init__(fg_color=BG)
        self.title("Tạo mã QR")
        self.resizable(False, False)

        self.image = None
        self.fill_color = "#000000"
        self.back_color = "#FFFFFF"

        card = ctk.CTkFrame(self, fg_color=CARD, corner_radius=16, border_width=1, border_color=BORDER)
        card.pack(padx=20, pady=20)

        # Tiêu đề (căn giữa) + nút đổi sáng/tối ở góc phải
        ctk.CTkLabel(card, text="Tạo mã QR", font=ctk.CTkFont(size=22, weight="bold")).pack(pady=(22, 0))
        ctk.CTkLabel(card, text="Dán đường link để tạo mã QR ngay", text_color=MUTED,
                     font=ctk.CTkFont(size=13)).pack()
        self.theme_btn = ctk.CTkButton(card, text="Tối", width=56, height=30, corner_radius=15,
                                       fg_color="transparent", hover_color=BORDER, border_width=1,
                                       border_color=BORDER, font=ctk.CTkFont(size=12),
                                       text_color=("#111827", "#F9FAFB"), command=self.toggle_theme)
        self.theme_btn.place(relx=1.0, x=-20, y=20, anchor="ne")

        # Ô nhập link
        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill="x", padx=24, pady=(18, 0))
        self.link_entry = ctk.CTkEntry(row, placeholder_text="https://...", width=380, height=40,
                                       corner_radius=10, border_color=BORDER, font=ctk.CTkFont(size=14))
        self.link_entry.pack(side="left", fill="x", expand=True)
        self.link_entry.bind("<Return>", lambda e: self.generate())
        ctk.CTkButton(row, text="Dán", width=64, height=40, corner_radius=10,
                      fg_color=("#EEF2FF", "#312E81"), hover_color=("#E0E7FF", "#3730A3"),
                      text_color=(ACCENT, "#C7D2FE"), command=self.paste).pack(side="left", padx=(8, 0))

        # Tùy chọn: kích thước + màu — dùng lưới 2 hàng để nhãn và điều khiển thẳng hàng
        opts = ctk.CTkFrame(card, fg_color="transparent")
        opts.pack(fill="x", padx=24, pady=(16, 0))
        opts.grid_columnconfigure(0, weight=1)
        small = ctk.CTkFont(size=12)

        self.size_label = ctk.CTkLabel(opts, text="Kích thước ô: 10", text_color=MUTED, font=small,
                                       height=20)
        self.size_label.grid(row=0, column=0, sticky="w")
        self.size_slider = ctk.CTkSlider(opts, from_=2, to=40, number_of_steps=38, width=220,
                                         button_color=ACCENT, button_hover_color=ACCENT_HOVER,
                                         progress_color=ACCENT, command=self.on_size)
        self.size_slider.set(10)
        self.size_slider.grid(row=1, column=0, sticky="w", pady=(4, 0))

        self.fill_btn = self.color_swatch(opts, 1, "Màu QR", self.pick_fill)
        self.back_btn = self.color_swatch(opts, 2, "Màu nền", self.pick_back)
        self.update_swatches()

        # Khung xem trước
        preview_wrap = ctk.CTkFrame(card, fg_color=("#F9FAFB", "#111827"), corner_radius=12,
                                    border_width=1, border_color=BORDER)
        preview_wrap.pack(padx=24, pady=(18, 0))
        self.preview = ctk.CTkLabel(preview_wrap, text="Mã QR sẽ hiện ở đây", text_color=MUTED,
                                    width=PREVIEW_SIZE, height=PREVIEW_SIZE)
        self.preview.pack(padx=12, pady=12)

        # Nút hành động
        actions = ctk.CTkFrame(card, fg_color="transparent")
        actions.pack(fill="x", padx=24, pady=(18, 0))
        ctk.CTkButton(actions, text="Tạo mã QR", height=42, corner_radius=10, fg_color=ACCENT,
                      hover_color=ACCENT_HOVER, font=ctk.CTkFont(size=14, weight="bold"),
                      command=self.generate).pack(side="left", fill="x", expand=True)
        self.save_btn = ctk.CTkButton(actions, text="Lưu ảnh", height=42, corner_radius=10,
                                      fg_color="transparent", border_width=1, border_color=BORDER,
                                      text_color=("#111827", "#F9FAFB"), hover_color=BORDER,
                                      font=ctk.CTkFont(size=14), state="disabled", command=self.save)
        self.save_btn.pack(side="left", fill="x", expand=True, padx=(10, 0))

        self.status = ctk.CTkLabel(card, text=" ", text_color=MUTED, font=ctk.CTkFont(size=12))
        self.status.pack(padx=24, pady=(8, 16))

        self.link_entry.focus()

    # ---------- tiện ích giao diện ----------
    def color_swatch(self, parent, column, label, command):
        ctk.CTkLabel(parent, text=label, text_color=MUTED, font=ctk.CTkFont(size=12),
                     height=20).grid(row=0, column=column, padx=(16, 0))
        btn = ctk.CTkButton(parent, text="", width=64, height=28, corner_radius=8,
                            border_width=2, border_color=BORDER, command=command)
        btn.grid(row=1, column=column, padx=(16, 0), pady=(4, 0))
        return btn

    def update_swatches(self):
        self.fill_btn.configure(fg_color=self.fill_color, hover_color=self.fill_color)
        self.back_btn.configure(fg_color=self.back_color, hover_color=self.back_color)

    def set_status(self, text, error=False):
        self.status.configure(text=text, text_color="#DC2626" if error else MUTED)

    def toggle_theme(self):
        dark = ctk.get_appearance_mode() == "Light"
        ctk.set_appearance_mode("dark" if dark else "light")
        self.theme_btn.configure(text="Sáng" if dark else "Tối")

    # ---------- xử lý ----------
    def on_size(self, value):
        self.size_label.configure(text=f"Kích thước ô: {int(value)}")

    def paste(self):
        try:
            text = self.clipboard_get().strip()
        except tk.TclError:
            self.set_status("Clipboard trống.", error=True)
            return
        self.link_entry.delete(0, "end")
        self.link_entry.insert(0, text)
        self.generate()

    def pick_fill(self):
        color = colorchooser.askcolor(self.fill_color, title="Chọn màu QR")[1]
        if color:
            self.fill_color = color
            self.update_swatches()
            if self.image:
                self.generate()

    def pick_back(self):
        color = colorchooser.askcolor(self.back_color, title="Chọn màu nền")[1]
        if color:
            self.back_color = color
            self.update_swatches()
            if self.image:
                self.generate()

    def generate(self):
        link = self.link_entry.get().strip()
        if not link:
            self.set_status("Vui lòng nhập đường link.", error=True)
            return
        try:
            self.image = make_qr_image(link, box_size=int(self.size_slider.get()),
                                       fill_color=self.fill_color, back_color=self.back_color)
        except Exception as exc:  # ví dụ: link quá dài
            self.set_status(f"Không tạo được mã QR: {exc}", error=True)
            return

        preview = self.image.resize((PREVIEW_SIZE * 2, PREVIEW_SIZE * 2), Image.NEAREST)
        self.preview_img = ctk.CTkImage(preview, size=(PREVIEW_SIZE, PREVIEW_SIZE))
        self.preview.configure(image=self.preview_img, text="")
        self.save_btn.configure(state="normal")
        w, h = self.image.size
        self.set_status(f"✓ Đã tạo mã QR ({w}×{h} px)")

    def save(self):
        if not self.image:
            return
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        path = filedialog.asksaveasfilename(
            initialdir=OUTPUT_DIR,
            initialfile=default_filename(self.link_entry.get().strip()),
            defaultextension=".png",
            filetypes=[("PNG", "*.png"), ("JPEG", "*.jpg"), ("Tất cả", "*.*")],
        )
        if path:
            self.image.save(path)
            self.set_status(f"✓ Đã lưu: {path}")


def main():
    ctk.set_appearance_mode("light")
    QRApp().mainloop()


if __name__ == "__main__":
    main()
