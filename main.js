import "@line/liff";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ===== Supabase設定 =====
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9zZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== LIFF設定 =====
const LIFF_ID = "2008316836-YLR2y1Zj";

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
    console.log("✅ LINEログイン:", window.LINE_NAME);

    await initCalendar();
  } catch (err) {
    console.error("❌ LIFF初期化エラー:", err);
  }
});

// ===== カレンダー初期化 =====
async function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  // イベント一覧取得
  const { data: events, error } = await supabase.from("events").select("*");
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
      extendedProps: { time: e.time, place: e.place },
    })),
    eventClick: (info) => openModal(info.event),
  });

  calendar.render();

  // あなたの予約セッション一覧
  const list = document.getElementById("mySessionList");
  list.innerHTML = "<li>読み込み中...</li>";

  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("date, status")
    .eq("user_id", window.LINE_USER_ID)
    .eq("status", "reserved");

  if (resError) {
    console.error("予約一覧取得エラー:", resError.message);
    list.innerHTML = "<li>読み込み失敗しました。</li>";
    return;
  }

  list.innerHTML = "";
  if (!reservations || reservations.length === 0) {
    list.innerHTML = "<li>現在予約はありません。</li>";
  } else {
    reservations.sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const r of reservations) {
      const event = events.find((e) => e.date === r.date);
      const title = event?.title || "（不明なイベント）";
      const time = event?.time || "";
      const place = event?.place || "";
      const li = document.createElement("li");
      li.textContent = `📅 ${r.date} ${time}｜${title}（${place}）`;
      list.appendChild(li);
    }
  }
}

// ===== モーダル表示処理 =====
async function openModal(event) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const participantList = document.getElementById("participantList");
  const nameInput = document.getElementById("nameInput");

  const { title, extendedProps } = event;
  const { time, place } = extendedProps;

  modalTitle.textContent = `${title}｜${event.startStr}`;
  participantList.innerHTML = "";

  const { data: reservations } = await supabase
    .from("reservations")
    .select("user_name")
    .eq("date", event.startStr)
    .eq("status", "reserved");

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
