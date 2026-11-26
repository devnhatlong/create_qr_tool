/**
 * Google Apps Script: nhận log từ qr-redirect.js và ghi vào Google Sheet.
 *
 * Cài đặt:
 *   1. Tạo Google Sheet mới trong Google Drive.
 *   2. Tiện ích mở rộng > Apps Script, dán toàn bộ file này vào, lưu.
 *   3. Triển khai > Tùy chọn triển khai mới > Loại: Ứng dụng web
 *        - Thực thi với tư cách: Tôi
 *        - Người có quyền truy cập: Bất kỳ ai
 *   4. Cấp quyền, copy "URL ứng dụng web" (đuôi /exec) dán vào CONFIG.logUrl trong qr-redirect.js.
 */

var SHEET_NAME = 'Lượt truy cập';

// Thứ tự cột trong Sheet: [tên khóa trong dữ liệu gửi lên, tiêu đề cột]
var COLUMNS = [
  ['thoi_gian', 'Thời gian'],
  ['nguon', 'Nguồn'],
  ['he_dieu_hanh', 'Hệ điều hành'],
  ['phien_ban', 'Phiên bản'],
  ['mau_may', 'Mẫu máy'],
  ['trinh_duyet', 'Trình duyệt / App quét'],
  ['chuyen_toi', 'Chuyển tới'],
  ['ngon_ngu', 'Ngôn ngữ'],
  ['mui_gio', 'Múi giờ'],
  ['man_hinh', 'Màn hình'],
  ['ty_le_diem_anh', 'Tỉ lệ điểm ảnh'],
  ['mang', 'Mạng'],
  ['trang_truoc', 'Trang trước'],
  ['ma_thiet_bi', 'Mã thiết bị (ẩn danh)'],
  ['lan_dau', 'Lần đầu'],
  ['tham_so', 'Tham số URL'],
  ['user_agent', 'User-Agent']
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // tránh ghi đè khi nhiều người quét cùng lúc
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    data.thoi_gian = new Date();

    var sheet = getSheet_();
    var row = COLUMNS.map(function (c) {
      var v = data[c[0]];
      if (v === undefined || v === null) return '';
      // Chặn công thức độc hại (=, +, -, @) khi mở bằng Sheets/Excel
      if (typeof v === 'string') v = v.slice(0, 1000).replace(/^([=+\-@])/, "'$1");
      return v;
    });
    sheet.appendRow(row);
    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  } finally {
    lock.releaseLock();
  }
}

// Mở URL /exec trên trình duyệt để kiểm tra script đang chạy.
function doGet() {
  var sheet = getSheet_();
  return ContentService.createTextOutput('OK - đã ghi ' + Math.max(sheet.getLastRow() - 1, 0) + ' lượt.');
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(function (c) { return c[1]; }));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#EEF2FF');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
  return sheet;
}
