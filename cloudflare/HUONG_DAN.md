# QR tự nhận diện Android / iOS bằng Cloudflare Worker

```
Quét QR -> Cloudflare Worker (máy chủ) -> ghi log về Google Sheet (Apps Script, có mã bí mật)
                                        -> 302 chuyển tới CH Play / App Store / trang giới thiệu
```
Trình duyệt người quét không nhận được code hay link log nào.

## 1. Cập nhật Apps Script
1. Mở Google Sheet → **Tiện ích mở rộng → Apps Script**.
2. Xóa code cũ, dán toàn bộ [`../apps_script/Code.gs`](../apps_script/Code.gs), **Lưu**.
3. **Triển khai → Quản lý triển khai** → bấm ✏️ → **Phiên bản: Phiên bản mới** → **Triển khai**.
   Link `/exec` giữ nguyên.

## 2. Tạo Cloudflare Worker
1. Đăng ký miễn phí tại https://dash.cloudflare.com/sign-up
2. Menu trái **Compute (Workers) → Workers & Pages → Create → Start with Hello World**.
3. Đặt tên, ví dụ `danhba` → **Deploy**.
4. Bấm **Edit code**, xóa code mẫu, dán toàn bộ [`worker.js`](worker.js) → **Deploy**.
5. Quay lại Worker → **Settings → Variables and Secrets → Add**, thêm 2 biến, **Type: Secret**:

   | Variable name | Value |
   |---|---|
   | `LOG_URL` | link `/exec` của Apps Script |
   | `LOG_TOKEN` | giá trị `TOKEN` trong `Code.gs` |

   → **Deploy**.
6. Link Worker hiện ở trang tổng quan, dạng `https://danhba.<ten-tai-khoan>.workers.dev`.

## 3. Thử
- Mở link Worker bằng điện thoại Android → CH Play; iPhone → App Store; máy tính → trang giới thiệu.
- Google Sheet có tab mới **"Lượt quét"** với 1 dòng cho mỗi lần mở.

## 4. Dọn trang GitHub Pages
Trong repo `download-app-danhba`: xóa file `qr-redirect.js` và dòng `<script src="qr-redirect.js"></script>`, commit + push.

## 5. Tạo QR mới
Chạy `python qr_gui.py`, nhập link Worker. Muốn biết QR nào được quét nhiều, thêm `?src=`:
```
https://danhba.<ten-tai-khoan>.workers.dev/?src=poster
https://danhba.<ten-tai-khoan>.workers.dev/?src=to-roi
```

## Ghi chú
- Gói miễn phí Cloudflare: 100.000 lượt/ngày.
- Vị trí (tỉnh/thành, nhà mạng) do Cloudflare ước lượng theo IP, chỉ ở mức thành phố; không lưu IP.
- Bot xem trước link (Facebook, Zalo…) không được ghi log.
- Đổi link cửa hàng: sửa `ANDROID_URL` / `IOS_URL` / `LANDING_URL` đầu `worker.js` → Deploy. QR đã in không cần in lại.
