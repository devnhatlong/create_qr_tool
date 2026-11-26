/**
 * Google Apps Script: nhận log từ Cloudflare Worker và ghi vào Google Sheet.
 *
 * Chỉ chấp nhận dữ liệu có đúng TOKEN (mã bí mật chỉ Worker biết), nên dù link /exec
 * bị lộ, người khác cũng không ghi được dữ liệu giả.
 *
 * Sau khi sửa file này: Triển khai > Quản lý triển khai > (bút chì) Sửa > Phiên bản: Phiên bản mới > Triển khai.
 * Link /exec giữ nguyên.
 */

// Mã bí mật — phải trùng với biến LOG_TOKEN của Cloudflare Worker. Không chia sẻ công khai.
var TOKEN = 'AESPU8PQSZji1Uich1gjeA2luCmzzqTe';

var SHEET_NAME = 'Lượt quét';

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
  ['quoc_gia', 'Quốc gia'],
  ['tinh_thanh', 'Tỉnh / Thành'],
  ['thanh_pho', 'Thành phố'],
  ['mui_gio', 'Múi giờ'],
  ['nha_mang', 'Nhà mạng'],
  ['ma_thiet_bi', 'Mã thiết bị (ẩn danh)'],
  ['lan_dau', 'Lần đầu'],
  ['user_agent', 'User-Agent']
];

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return ContentService.createTextOutput('bad request');
  }
  if (data.token !== TOKEN) return ContentService.createTextOutput('forbidden');

  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // tránh ghi đè khi nhiều người quét cùng lúc
  try {
    data.thoi_gian = new Date();
    var row = COLUMNS.map(function (c) {
      var v = data[c[0]];
      if (v === undefined || v === null) return '';
      // Chặn công thức (=, +, -, @) khi mở bằng Sheets/Excel
      if (typeof v === 'string') v = v.slice(0, 1000).replace(/^([=+\-@])/, "'$1");
      return v;
    });
    getSheet_().appendRow(row);
    return ContentService.createTextOutput('ok');
  } finally {
    lock.releaseLock();
  }
}

// Mở link /exec trên trình duyệt để kiểm tra script còn chạy (không lộ dữ liệu).
function doGet() {
  return ContentService.createTextOutput('OK');
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME, 0);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(function (c) { return c[1]; }));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#EEF2FF');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('dd/MM/yyyy HH:mm:ss');
  }
  return sheet;
}
