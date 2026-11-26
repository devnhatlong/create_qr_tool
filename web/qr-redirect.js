/*
 * qr-redirect.js — nhận diện thiết bị, chuyển tới CH Play / App Store và ghi log lượt truy cập
 * vào Google Sheet (qua Google Apps Script).
 *
 * Nhúng vào <head> của index.html:
 *   <script src="qr-redirect.js"></script>
 *
 * Link in lên mã QR:  https://devnhatlong.github.io/download-app-danhba/?qr=1
 *   - Có ?qr=1  + điện thoại  -> tự chuyển tới cửa hàng tương ứng.
 *   - Không có ?qr=1 hoặc máy tính -> ở lại trang giới thiệu như bình thường.
 *   - Mọi lượt truy cập đều được ghi log (cột "nguon" cho biết đến từ QR hay web).
 */
(function () {
  "use strict";

  var CONFIG = {
    android: "https://play.google.com/store/apps/details?id=com.danhbacald.app&hl=vi",
    ios: "https://apps.apple.com/vn/app/danh-b%E1%BA%A1-c%C3%B4ng-an-l%C3%A2m-%C4%91%E1%BB%93ng/id6757072784?l=vi",
    // Dán URL Web App của Google Apps Script vào đây (kết thúc bằng /exec). Để trống = không ghi log.
    logUrl: "https://script.google.com/macros/s/AKfycbwhJnUGekcvdG1H4eUxZCRNOy003-UUJVd21MkKovm6768RQX8KVAixlv8FVvyEdUId/exec",
    // Chỉ tự chuyển hướng khi link có tham số này (link trong mã QR).
    qrParam: "qr",
    // Thời gian tối đa chờ gửi log trước khi chuyển hướng (ms).
    maxWait: 700
  };

  var ua = navigator.userAgent || "";
  var params = new URLSearchParams(location.search);
  var fromQR = params.has(CONFIG.qrParam);

  // ---------- Nhận diện ----------
  // iPadOS 13+ tự báo là Mac -> nhận ra nhờ màn hình cảm ứng.
  var isIOS = /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = !isIOS && /Android/i.test(ua);

  function detectOS() {
    if (isIOS) {
      // iPad giả Mac không có "OS x_y" -> lấy theo phiên bản Safari (thường trùng phiên bản iOS)
      var m = ua.match(/OS (\d+(?:_\d+)*) like Mac/) || ua.match(/Version\/(\d+(?:\.\d+)*)/);
      var type = /iPad/i.test(ua) || !/iPhone|iPod/i.test(ua) ? "iPad" : /iPod/i.test(ua) ? "iPod" : "iPhone";
      return { os: "iOS", version: m ? m[1].replace(/_/g, ".") : "", model: type };
    }
    if (isAndroid) {
      var a = ua.match(/Android\s([\d.]+)/);
      var model = (ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\sBuild|\))/) || [])[1] || "";
      if (model === "K") model = ""; // Chrome giấu tên máy -> lấy từ Client Hints bên dưới
      return { os: "Android", version: a ? a[1] : "", model: model };
    }
    if (/Windows/i.test(ua)) return { os: "Windows", version: "", model: "" };
    if (/Mac OS X/i.test(ua)) return { os: "macOS", version: "", model: "" };
    if (/Linux/i.test(ua)) return { os: "Linux", version: "", model: "" };
    return { os: "Khác", version: "", model: "" };
  }

  function detectBrowser() {
    var list = [
      ["Zalo", /Zalo/i], ["Facebook", /FBAN|FBAV|FB_IAB/i], ["Messenger", /Messenger/i],
      ["Instagram", /Instagram/i], ["TikTok", /musical_ly|TikTok|BytedanceWebview/i],
      ["Cốc Cốc", /coc_coc_browser/i], ["Samsung Internet", /SamsungBrowser/i],
      ["Edge", /EdgA|EdgiOS|Edg\//i], ["Opera", /OPR|OPiOS/i], ["Firefox", /FxiOS|Firefox/i],
      ["Chrome", /CriOS|Chrome/i], ["Safari", /Safari/i]
    ];
    for (var i = 0; i < list.length; i++) if (list[i][1].test(ua)) return list[i][0];
    return "Khác";
  }

  // ID ngẫu nhiên lưu trên máy để đếm số thiết bị khác nhau (không chứa thông tin cá nhân).
  function visitorId() {
    try {
      var id = localStorage.getItem("dl_vid");
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("dl_vid", id);
        return { id: id, first: true };
      }
      return { id: id, first: false };
    } catch (e) {
      return { id: "", first: "" };
    }
  }

  // Chrome/Edge/Samsung trên Android trả về tên máy và phiên bản Android thật qua Client Hints.
  function highEntropy() {
    if (!navigator.userAgentData || !navigator.userAgentData.getHighEntropyValues) {
      return Promise.resolve({});
    }
    return navigator.userAgentData
      .getHighEntropyValues(["model", "platformVersion"])
      .catch(function () { return {}; });
  }

  function timeout(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // ---------- Ghi log ----------
  function sendLog(target) {
    if (!CONFIG.logUrl) return Promise.resolve();

    return Promise.race([highEntropy(), timeout(300)]).then(function (he) {
      he = he || {};
      var os = detectOS();
      var vid = visitorId();
      var conn = navigator.connection || {};
      var data = {
        nguon: fromQR ? "QR" : "Web",
        he_dieu_hanh: os.os,
        phien_ban: (isAndroid && he.platformVersion) || os.version,
        mau_may: (isAndroid && he.model) || os.model,
        trinh_duyet: detectBrowser(),
        chuyen_toi: target ? (isIOS ? "App Store" : "CH Play") : "Ở lại trang",
        ngon_ngu: navigator.language || "",
        mui_gio: (Intl.DateTimeFormat().resolvedOptions().timeZone) || "",
        man_hinh: screen.width + "x" + screen.height,
        ty_le_diem_anh: window.devicePixelRatio || "",
        mang: conn.effectiveType || "",
        trang_truoc: document.referrer || "",
        ma_thiet_bi: vid.id,
        lan_dau: vid.first,
        tham_so: location.search,
        user_agent: ua
      };

      var req = fetch(CONFIG.logUrl, {
        method: "POST",
        mode: "no-cors",
        keepalive: true, // vẫn gửi được dù trang đã chuyển đi
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(data)
      }).catch(function () {});
      return Promise.race([req, timeout(CONFIG.maxWait)]);
    });
  }

  // ---------- Chạy ----------
  var target = null;
  if (fromQR) {
    if (isIOS) target = CONFIG.ios;
    else if (isAndroid) target = CONFIG.android;
  }

  sendLog(target).then(function () {
    // replace(): không lưu trang này vào lịch sử -> bấm "Quay lại" không bị chuyển hướng lặp lại.
    if (target) location.replace(target);
  });
})();
