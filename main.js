import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🟩 Supabase接続設定
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedDate = null;
let selectedTitle = null;

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const memberList = document.getElementById("member-list");
  const nicknameInput = document.getElementById("nickname-input");
  const reserveBtn = document.getElementById("reserve-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const closeBtn = document.getElementById("close-btn");

  // カレンダー表示
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    height: "auto",
    events: await loadEvents(),
    dateClick: async (info) => {
      const events = await loadEvents();
      const clickedEvent = events.find(e => e.start === info.dateStr);
      if (!clickedEvent) {
        alert("この日にはイベントがありません。");
        return;
      }

      // モーダル開く
      selectedDate = info.dateStr;
      selectedTitle = clickedEvent.title;
      modal.style.display = "flex";
      modalTitle.textContent = `${clickedEvent.title}｜${info.dateStr} の参加者`;

      await refreshMembers(memberList, info.dateStr);
    },
  });

  calendar.render();

  // 🟦 参加ボタン
  reserveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const name = nicknameInput.value.trim();
    if (!name) return alert("名前を入力してください");

    const { error } = await supabase
      .from("reservations")
      .insert([{ date: selectedDate, nickname: name, status: "reserved" }]);

    if (error) {
      alert("登録エラー: " + error.message);
    } else {
      alert("予約しました！");
      modal.style.display = "none";
      calendar.refetchEvents();
    }
  });

  // 🟥 キャンセルボタン
  cancelBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    const name = nicknameInput.value.trim();
    if (!name) return alert("キャンセルする名前を入力してください");

    const { error } = await supabase
      .from("reservations")
      .update({ status: "canceled" })
      .eq("date", selectedDate)
      .eq("nickname", name);

    if (error) {
      alert("キャンセル失敗: " + error.message);
    } else {
      alert("キャンセル完了！");
      modal.style.display = "none";
      calendar.refetchEvents();
    }
  });

  // ⬜ 閉じるボタン
  closeBtn.addEventListener("click", () => (modal.style.display = "none"));
});

// 🟨 参加者リスト再取得
async function refreshMembers(target, date) {
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("date", date)
    .eq("status", "reserved");

  target.innerHTML = reservations.length
    ? reservations.map(r => `・${r.nickname}`).join("<br>")
    : "（まだ参加者はいません）";
}

// 🟩 イベント一覧読み込み
async function loadEvents() {
  const { data: events } = await supabase.from("calendar_events").select("*");
  const { data: reservations } = await supabase
    .from("reservations")
    .select("*")
    .eq("status", "reserved");

  const counts = reservations.reduce((acc, r) => {
    acc[r.date] = (acc[r.date] || 0) + 1;
    return acc;
  }, {});

  return events.map(e => ({
    title: `${e.title}（${counts[e.date] || 0}名）`,
    start: e.date,
  }));
}
