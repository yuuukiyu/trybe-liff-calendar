alert("app.js 読み込みOK"); 
console.log("app.js loaded ✓");

// Supabase（esm.sh 経由）
const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

// LINE Notify 用
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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    alert("DOMContentLoaded OK");

    await liff.init({ liffId: LIFF_ID });
    alert("LIFF init OK");

    if (!liff.isLoggedIn()) {
      alert("LIFF login required → login() 実行");
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    window.LINE_USER_ID = profile.userId;
    window.LINE_NAME = profile.displayName;

    alert("ログイン確認OK: " + window.LINE_NAME);

    console.log("✅ LINEログイン:", window.LINE_NAME);

    await initCalendar();
    alert("initCalendar DONE");

    // 管理者UI表示
    if (ADMIN_LINE_IDS.includes(window.LINE_USER_ID)) {
      document.getElementById("openAdminModalBtn").style.display = "inline-block";
      setupAdminButtons();
    }

  } catch (err) {
    alert("LIFF初期化エラー: " + err);
    console.error("❌ LIFF初期化エラー:", err);
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
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.date,
      extendedProps: { time: e.time, place: e.place },
    })),
    eventClick: (info) => openModal(info.event),
  });

  calendar.render();
  alert("calendar.render OK");

  await loadMySessions(events);
}

// ===== あなたの予約セッション一覧 =====
async function loadMySessions(events) {
  const list = document.getElementById("mySessionList");
  list.innerHTML = "<li>読み込み中...</li>";

  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("date, status")
    .eq("user_id", window.LINE_USER_ID)
    .eq("status", "reserved");

  if (resError) {
    alert("予約一覧取得エラー: " + resError.message);
    list.innerHTML = "<li>読み込み失敗しました。</li>";
    return;
  }

  alert("予約件数: " + reservations.length);

  const today = new Date().toISOString().split("T")[0];
  const futureReservations = reservations.filter((r) => r.date >= today);

  list.innerHTML = "";
  if (!futureReservations.length) {
    list.innerHTML = "<li>現在予約はありません。</li>";
    return;
  }

  futureReservations.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const r of futureReservations) {
    const event = events.find((e) => e.date === r.date);

    const title = event?.title || "（不明なイベント）";
    const time = event?.time || "";
    const place = event?.place || "";

    const { count } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("date", r.date)
      .eq("status", "reserved");

    const li = document.createElement("li");
    li.innerHTML = `
      📅 ${r.date} ${time}｜${title}（${place}）<br>
      👥 参加者：${count || 0}人
    `;
    li.style.marginBottom = "12px";
    list.appendChild(li);
  }
}
