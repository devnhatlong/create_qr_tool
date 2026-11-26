/**
 * Cloudflare Worker: nhận diện thiết bị khi quét QR -> chuyển tới CH Play / App Store,
 * đồng thời ghi log về Google Sheet (qua Apps Script). Toàn bộ chạy trên máy chủ,
 * trình duyệt người quét chỉ nhận về lệnh chuyển hướng, không thấy code hay link log.
 *
 * Biến môi trường (Settings > Variables and Secrets, loại Secret):
 *   LOG_URL   = URL /exec của Google Apps Script
 *   LOG_TOKEN = mã bí mật, trùng với TOKEN trong Code.gs
 *
 * Link in lên QR:  https://<ten-worker>.<tai-khoan>.workers.dev/
 * Muốn phân biệt nhiều QR:  .../?src=poster, .../?src=to-roi  (ghi vào cột "Nguồn")
 */

const ANDROID_URL = "https://play.google.com/store/apps/details?id=com.danhbacald.app&hl=vi";
const IOS_URL = "https://apps.apple.com/vn/app/danh-b%E1%BA%A1-c%C3%B4ng-an-l%C3%A2m-%C4%91%E1%BB%93ng/id6757072784?l=vi";
const LANDING_URL = "https://devnhatlong.github.io/download-app-danhba/";

// Xin trình duyệt Chromium gửi tên máy + phiên bản Android thật (Chrome giấu trong User-Agent).
const CLIENT_HINTS = "Sec-CH-UA-Model, Sec-CH-UA-Platform-Version";
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|curl|wget|python|httpclient|headless/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/") return new Response(null, { status: 404 });

    const h = request.headers;
    const ua = h.get("user-agent") || "";
    const device = detect(ua, h, url.searchParams.get("_t"));

    // Chromium chưa gửi tên máy -> yêu cầu gửi (Critical-CH: Chrome tự gửi lại request ngay).
    // Nếu trình duyệt không hỗ trợ, nó đi theo 302 về chính link này kèm _ch=1 và vẫn được ghi log.
    if (device.os === "Android" && h.has("sec-ch-ua") && !h.has("sec-ch-ua-model") && !url.searchParams.has("_ch")) {
      const again = new URL(url);
      again.searchParams.set("_ch", "1");
      return new Response(null, {
        status: 302,
        headers: { Location: again.toString(), "Accept-CH": CLIENT_HINTS, "Critical-CH": CLIENT_HINTS, Vary: CLIENT_HINTS, "Cache-Control": "no-store" }
      });
    }

    // User-Agent kiểu Mac: có thể là iPad (iPadOS giả Mac) -> cho trình duyệt tự kiểm tra màn hình cảm ứng.
    if (device.os === "macOS?") return macCheckPage(url);

    const target = device.os === "iOS" ? IOS_URL : device.os === "Android" ? ANDROID_URL : LANDING_URL;

    // Mã thiết bị ẩn danh (cookie) để đếm số máy khác nhau.
    let vid = (h.get("cookie") || "").match(/(?:^|;\s*)vid=([\w-]+)/)?.[1];
    const firstTime = !vid;
    if (!vid) vid = crypto.randomUUID();

    if (request.method === "GET" && !BOT_RE.test(ua) && env.LOG_URL) {
      const cf = request.cf || {};
      const data = {
        token: env.LOG_TOKEN || "",
        nguon: url.searchParams.get("src") || "QR",
        he_dieu_hanh: device.os,
        phien_ban: device.version,
        mau_may: device.model,
        trinh_duyet: detectBrowser(ua),
        chuyen_toi: target === IOS_URL ? "App Store" : target === ANDROID_URL ? "CH Play" : "Trang giới thiệu",
        ngon_ngu: (h.get("accept-language") || "").split(",")[0],
        quoc_gia: cf.country || "",
        tinh_thanh: cf.region || "",
        thanh_pho: cf.city || "",
        mui_gio: cf.timezone || "",
        nha_mang: cf.asOrganization || "",
        ma_thiet_bi: vid,
        lan_dau: firstTime,
        user_agent: ua
      };
      // Gửi log song song, không bắt người dùng chờ.
      ctx.waitUntil(
        fetch(env.LOG_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }).catch(() => {})
      );
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: target,
        "Cache-Control": "no-store",
        "Accept-CH": CLIENT_HINTS,
        "Set-Cookie": `vid=${vid}; Max-Age=63072000; Path=/; Secure; HttpOnly; SameSite=Lax`
      }
    });
  }
};

function detect(ua, h, macCheck) {
  if (macCheck === "ipad") return { os: "iOS", version: (ua.match(/Version\/([\d.]+)/) || [])[1] || "", model: "iPad" };
  if (macCheck === "mac") return { os: "macOS", version: "", model: "" };

  if (/iPhone|iPad|iPod/i.test(ua)) {
    const v = (ua.match(/OS (\d+(?:_\d+)*) like Mac/) || [])[1] || "";
    return { os: "iOS", version: v.replace(/_/g, "."), model: (ua.match(/iPhone|iPad|iPod/i) || [""])[0] };
  }
  if (/Android/i.test(ua)) {
    const unquote = (s) => (s || "").replace(/^"|"$/g, "");
    let model = unquote(h.get("sec-ch-ua-model"));
    if (!model) {
      model = (ua.match(/Android[^;)]*;\s*([^;)]+?)(?:\sBuild|\))/) || [])[1] || "";
      if (model === "K") model = "";
    }
    const version = unquote(h.get("sec-ch-ua-platform-version")) || (ua.match(/Android\s([\d.]+)/) || [])[1] || "";
    return { os: "Android", version, model };
  }
  if (/Macintosh|Mac OS X/i.test(ua)) return { os: "macOS?", version: "", model: "" };
  if (/Windows/i.test(ua)) return { os: "Windows", version: "", model: "" };
  if (/Linux|CrOS/i.test(ua)) return { os: "Linux", version: "", model: "" };
  return { os: "Khác", version: "", model: "" };
}

function detectBrowser(ua) {
  const list = [
    ["Zalo", /Zalo/i], ["Facebook", /FBAN|FBAV|FB_IAB/i], ["Messenger", /Messenger/i],
    ["Instagram", /Instagram/i], ["TikTok", /musical_ly|TikTok|BytedanceWebview/i],
    ["Cốc Cốc", /coc_coc_browser/i], ["Samsung Internet", /SamsungBrowser/i],
    ["Edge", /EdgA|EdgiOS|Edg\//i], ["Opera", /OPR|OPiOS/i], ["Firefox", /FxiOS|Firefox/i],
    ["Chrome", /CriOS|Chrome/i], ["Safari", /Safari/i]
  ];
  for (const [name, re] of list) if (re.test(ua)) return name;
  return "Khác";
}

// Trang rất nhỏ chỉ dành cho máy báo là Mac: iPad có màn hình cảm ứng -> quay lại Worker với _t=ipad.
// Trang này không chứa link log hay mã bí mật.
function macCheckPage(url) {
  const next = (t) => { const u = new URL(url); u.searchParams.set("_t", t); return u.pathname + u.search; };
  const html = `<!DOCTYPE html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Đang chuyển…</title>
<script>location.replace(navigator.maxTouchPoints > 1 ? ${JSON.stringify(next("ipad"))} : ${JSON.stringify(next("mac"))});</script>
<noscript><meta http-equiv="refresh" content="0;url=${LANDING_URL}"></noscript>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
