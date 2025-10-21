import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🟩 Supabase接続設定
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🟨 DOM構築後に初期化
document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const memberList = document.getElementById("member-list");
  const nicknameInput = document.getElementById("nickname-input");
  const reserveBtn = document.getElementById("reserve-btn");
  const cancelBtn = document.getElementById("cancel-btn");
  const closeBtn = document.getElementById("close-btn");

  // カレンダー初期化
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

      modal.style.display = "flex";
      modalTitle.textContent = `${clickedEvent.title}｜${info.dateStr} の参加者`;

      const { data: reservations } = await supabase
        .from("reservations")
        .select("*")
        .eq("date", info.dateStr)
        .eq("status", "reserved");

      memberList.innerHTML = reservations.length
        ? reservations.map(r => `・${r.nickname}`).join("<br>")
        : "（まだ参加者はいません）";

      reserveBtn.onclick = async () => {
        const name = nicknameInput.value.trim();
        if (!name) return alert("名前を入力してください");

        await supabase.from("reservations").insert([
          { date: info.dateStr, nickname: name, status: "reserved" },
        ]);
        alert("予約しました！");
        modal.style.display = "none";
        calendar.refetchEvents();
      };

      cancelBtn.onclick = async () => {
        const name = nicknameInput.value.trim();
        if (!name) return alert("キャンセルする名前を入力してください");

        await supabase
          .from("reservations")
          .update({ status: "canceled" })
          .eq("date", info.dateStr)
          .eq("nickname", name);
        alert("キャンセル完了！");
        modal.style.display = "none";
        calendar.refetchEvents();
      };

      closeBtn.onclick = () => (modal.style.display = "none");
    },
  });

  calendar.render();
});

// 🟦 イベント情報を取得（予約人数含む）
async function loadEvents() {
  const { data: events, error: eventsError } = await supabase
    .from("calendar_events")
    .select("*");
  if (eventsError) {
    console.error("イベント取得エラー:", eventsError);
    return [];
  }

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
