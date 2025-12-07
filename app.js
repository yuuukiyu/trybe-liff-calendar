alert("app.js 読み込みOK");
console.log("app.js loaded ✓");

// ===== Supabase 通常 import（トップレベル await 不使用）=====
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { sendLineMessage } from "./notify.js";

// ===== Supabase設定 =====
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xoN3ouBTMqfSxKHwkpkmfg_4JwRIL-z";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== LIFF設定 =====
const LIFF_ID = "2008316836-YLR2y1Zj";

// 管理者LINE ID
const ADMIN_LINE_IDS = [
  "U491a0406fff27c1dfbcf5a9046d11b3a",
  "U98a9bd633e9362a39fc4da2937d2a89f",
];

// ===== DOM読み込み =====
document.addEventListener("DOMContentLoaded", async () => {
  alert("DOMContentLoaded OK");

  try {
    await liff.init({ liffId: LIFF_ID });
    alert("LIFF init OK");

    if (!liff.isLoggedIn()) {
      alert("ログインへ");
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    window.LINE_USER_ID = profile.userId;
    window.LINE_NAME = profile.displayName;

    alert("ログインOK: " + window.LINE_NAME);

    await initCalendar();
    alert("initCalendar OK");

    if (ADMIN_LINE_IDS.includes(window.LINE_USER_ID)) {
      document.getElementById("openAdminModalBtn").style.display = "inline-block";
      setupAdminButtons();
    }

  } catch (err) {
    alert("LIFF 初期化エラー: " + err);
    console.error(err);
  }
});

// ===== カレンダー初期化 =====
async function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  const { data: events, error } = await supabase.from("events").select("*");
  if (error) {
    alert("イベント取得エラー: " + error.message);
    return;
  }

  alert("イベント数: " + events.length);

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.date,
      extendedProps: { time: e.time, place: e.place }
    }))
  });

  calendar.render();
  alert("calendar.render OK");

  await loadMySessions(events);
}
