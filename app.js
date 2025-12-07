console.log("app.js loaded ✓");

// =========================
// Supabase 安定版 CDN
// =========================
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.46.1/dist/esm/supabase.js";
import { sendLineMessage } from "./notify.js";

// =========================
// Supabase 設定
// =========================
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xoN3ouBTMqfSxKHwkpkmfg_4JwRIL-z";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================
// LIFF 設定
// =========================
const LIFF_ID = "2008316836-YLR2y1Zj";

// 管理者 LINE ID
const ADMIN_LINE_IDS = [
  "U491a0406fff27c1dfbcf5a9046d11b3a",
  "U98a9bd633e9362a39fc4da2937d2a89f"
];

// =========================
// DOM Ready
// =========================
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await liff.init({ liffId: LIFF_ID });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    window.LINE_USER_ID = profile.userId;
    window.LINE_NAME = profile.displayName;

    console.log("LINE LOGIN:", window.LINE_NAME);

    // カレンダー初期化
    await initCalendar();

    // 管理者のみ追加UI表示
    if (ADMIN_LINE_IDS.includes(window.LINE_USER_ID)) {
      document.getElementById("openAdminModalBtn").style.display = "inline-block";
      setupAdminButtons();
    }

  } catch (err) {
    console.error("❌ LIFF 初期化エラー:", err);
    alert("LIFF 初期化エラー: " + err.message);
  }
});

// ======================================================
// カレンダー初期化
// ======================================================
async function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  const { data: events, error } = await supabase
    .from("events")
    .select("*");

  if (error) {
    alert("イベント取得エラー: " + error.message);
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.date,
      extendedProps: { time: e.time, place: e.place }
    })),
    eventClick: (info) => openModal(info.event)
  });

  calendar.render();

  // 予約一覧（あなたの予約）
  await loadMySessions(events);
}

// ======================================================
// 「あなたの予約」読み込み
// ======================================================
async function loadMySessions(events) {
  const list = document.getElementById("mySessionList");
  list.innerHTML = "<li>読み込み中...</li>";

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("date, status")
    .eq("user_id", window.LINE_USER_ID)
    .eq("status", "reserved");

  if (error) {
    list.innerHTML = "<li>予約取得エラー</li>";
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const future = reservations.filter((r) => r.date >= today);

  if (!future.length) {
    list.innerHTML = "<li>現在予約はありません。</li>";
    return;
  }

  list.innerHTML = "";

  for (const r of future) {
    const ev = events.find((e) => e.date === r.date);

    const li = document.createElement("li");
    li.innerHTML = `📅 ${r.date}｜${ev?.title || ""}（${ev?.place || ""}）`;
    list.appendChild(li);
  }
}

// ======================================================
// イベント詳細（モーダル）
// ======================================================
async function openModal(event) {

  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const participantList = document.getElementById("participantList");
  const nameInput = document.getElementById("nameInput");
  const joinBtn = document.getElementById("joinBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  modalTitle.textContent = `${event.title}｜${event.startStr}`;
  modal.style.display = "flex";
  participantList.innerHTML = "<li>読み込み中...</li>";

  // 参加者一覧
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", event.startStr)
    .eq("status", "reserved");

  participantList.innerHTML = "";

  const count = reservations?.length || 0;
  const header = document.createElement("p");
  header.innerHTML = `👥 参加者 <strong>${count}人</strong>`;
  participantList.appendChild(header);

  if (ADMIN_LINE_IDS.includes(window.LINE_USER_ID)) {
    // 管理者 → 名前公開
    reservations?.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = r.user_name;
      participantList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "（当日のお楽しみ）";
    li.style.color = "#888";
    participantList.appendChild(li);
  }

  // 自分が予約しているか
  const already = reservations.some(
    (r) => r.user_id === window.LINE_USER_ID
  );

  joinBtn.style.display = already ? "none" : "inline-block";
  cancelBtn.style.display = already ? "inline-block" : "none";

  // 参加
  joinBtn.onclick = async () => {
    await supabase.from("reservations").insert([
      {
        user_id: window.LINE_USER_ID,
        user_name: window.LINE_NAME,
        date: event.startStr,
        event_id: event.id,
        status: "reserved"
      }
    ]);

    alert("予約しました！");
    location.reload();
  };

  // キャンセル
  cancelBtn.onclick = async () => {
    await supabase
      .from("reservations")
      .update({ status: "canceled" })
      .eq("user_id", window.LINE_USER_ID)
      .eq("date", event.startStr);

    alert("キャンセルしました");
    location.reload();
  };

  document.getElementById("closeBtn").onclick = () =>
    (modal.style.display = "none");
}

// ======================================================
// 管理者 UI
// ======================================================
function setupAdminButtons() {
  const openBtn = document.getElementById("openAdminModalBtn");
  const adminModal = document.getElementById("adminModal");
  const closeBtn = document.getElementById("closeAdminModalBtn");

  openBtn.onclick = () => (adminModal.style.display = "flex");
  closeBtn.onclick = () => (adminModal.style.display = "none");

  // 追加ボタン
  document.getElementById("addEventBtn").onclick = async () => {
    const title = document.getElementById("eventTitle").value;
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;
    const place = document.getElementById("eventPlace").value;

    if (!title || !date || !time || !place) {
      alert("入力が不足しています");
      return;
    }

    await supabase.from("events").insert([{ title, date, time, place }]);

    alert("セッション追加しました！");
    location.reload();
  };
}
