import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");

  const events = await loadEvents();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events,

    // 🟩 日付クリックイベント
    dateClick: async function(info) {
      const date = info.dateStr;
      const nickname = prompt(`【${date}】に参加する名前を入力してください：`);

      if (!nickname) return;

      const confirmJoin = confirm(`${nickname} さんとして ${date} の予約を登録しますか？`);
      if (!confirmJoin) return;

const { data, error } = await supabase
  .from("trybe_reservations") // ← 新しいテーブル名
  .insert([{ date: date, nickname: nickname, status: "reserved" }]);


      if (error) {
        alert("❌ 登録に失敗しました：" + error.message);
      } else {
        alert("✅ 予約登録が完了しました！");
        location.reload(); // 再読み込みで反映
      }
    }
  });

  calendar.render();
});

// 🟩 イベント表示（calendar_eventsテーブルから）
async function loadEvents() {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("title, date");

  if (error) {
    console.error("Error fetching events:", error);
    return [];
  }

  return data.map(event => ({
    title: event.title,
    start: event.date
  }));
}
