// =======================
// main.js（LINE連携版）
// =======================

import "@line/liff";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase設定
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY = "あなたのanonキー";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// LIFF設定
const LIFF_ID = "2008316836-YLR2y1Zj"; // あなたのLIFF ID

// 初期化
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
    console.log("✅ LINEログイン完了:", profile.displayName);

    initCalendar(); // LIFF初期化後にカレンダー描画
  } catch (error) {
    console.error("LIFF初期化エラー:", error);
  }
});

// =======================
// カレンダー初期化
// =======================
async function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  const { data: events, error } = await supabase.from("calendar_events").select("*");
  if (error) {
    console.error("イベント取得エラー:", error);
    alert("イベント取得エラー");
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.date,
    })),
    eventClick: async (info) => openModal(info.event),
  });

  calendar.render();
}

// =======================
// モーダル表示
// =======================
async function openModal(event) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const participantList = document.getElementById("participantList");
  const nameInput = document.getElementById("nameInput");

  modalTitle.textContent = `${event.title}｜${event.startStr} の参加者`;

  // 参加者一覧取得
  const { data: reservations } = await supabase
    .from("reservations")
    .select("user_name")
    .eq("date", event.startStr)
    .eq("status", "reserved");

  participantList.innerHTML = "";
  reservations?.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r.user_name;
    participantList.appendChild(li);
  });

  nameInput.value = window.LINE_NAME || "";

  modal.style.display = "flex";

  // 参加ボタン
  document.getElementById("joinBtn").onclick = async () => {
    const { error } = await supabase.from("reservations").insert([
      {
        user_id: window.LINE_USER_ID,
        user_name: window.LINE_NAME,
        date: event.startStr,
        status: "reserved",
      },
    ]);
    if (error) alert("登録エラー: " + error.message);
    else {
      alert("✅ 予約しました！");
      modal.style.display = "none";
      location.reload();
    }
  };

  // キャンセルボタン
  document.getElementById("cancelBtn").onclick = async () => {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "canceled" })
      .eq("user_id", window.LINE_USER_ID)
      .eq("date", event.startStr);
    if (error) alert("キャンセルエラー: " + error.message);
    else {
      alert("🚫 キャンセルしました");
      modal.style.display = "none";
      location.reload();
    }
  };

  // 閉じるボタン
  document.getElementById("closeBtn").onclick = () => {
    modal.style.display = "none";
  };
}
