# QR tự nhận diện Android / iOS + ghi log về Google Drive

## 1. Tạo Google Sheet nhận log
1. Vào Google Drive → **Mới → Google Trang tính**, đặt tên ví dụ `Log QR Danh bạ`.
2. **Tiện ích mở rộng → Apps Script**, xóa code mẫu, dán toàn bộ [`../apps_script/Code.gs`](../apps_script/Code.gs), bấm Lưu.
3. **Triển khai → Tùy chọn triển khai mới**, bấm bánh răng chọn **Ứng dụng web**:
   - Thực thi với tư cách: **Tôi**
   - Người có quyền truy cập: **Bất kỳ ai**
4. Bấm Triển khai → cấp quyền → copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
5. Mở URL đó trên trình duyệt, thấy `OK - đã ghi 0 lượt.` là chạy được.

> Sửa `Code.gs` sau này: **Triển khai → Quản lý triển khai → Sửa → Phiên bản mới**, URL giữ nguyên.

## 2. Gắn vào trang GitHub Pages
1. Mở [`qr-redirect.js`](qr-redirect.js), dán URL ở bước 1.4 vào `logUrl: ""`.
2. Copy `qr-redirect.js` vào repo `download-app-danhba` (cùng thư mục với `index.html`).
3. Trong `index.html`, thêm vào trong `<head>`:
   ```html
   <script src="qr-redirect.js"></script>
   ```
4. Commit + push, chờ 1–2 phút GitHub Pages cập nhật.

## 3. Tạo mã QR
Chạy `python qr_gui.py`, nhập link **có `?qr=1`**:
```
https://devnhatlong.github.io/download-app-danhba/?qr=1
```

| Ai mở link | Kết quả |
|---|---|
| Quét QR bằng Android | Chuyển tới CH Play |
| Quét QR bằng iPhone / iPad | Chuyển tới App Store |
| Quét QR bằng máy tính | Ở lại trang giới thiệu |
| Vào trang bình thường (không `?qr=1`) | Ở lại trang giới thiệu |

Mọi lượt đều được ghi vào Sheet, cột **Nguồn** = `QR` hoặc `Web`.
Có thể in nhiều QR khác nhau để biết QR nào hiệu quả, ví dụ `?qr=poster`, `?qr=to-roi` — xem ở cột **Tham số URL**.
