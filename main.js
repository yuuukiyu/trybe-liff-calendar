import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");

  // 🟩 イベント＋予約データを結合
  const events = await loadCalendarData();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events,

    // 日付クリックで予約登録
    dateClick: async function(info) {
      const date = info.dateStr;
      const nickname = prompt(`【${date}】に参加する名前を入力してください：`);
      if (!nickname) return;

      const confirmJoin = confirm(`${nickname} さんとして ${date} の予約を登録しますか？`);
      if (!confirmJoin) return;

      const { error } = await supabase
        .from("trybe_reservations")
        .insert([{ date, nickname, status: "reserved" }]);

      if (error) {
        alert("❌ 登録に失敗しました：" + error.message);
      } else {
        alert("✅ 予約登録が完了しました！");
        location.reload();
      }
    }
  });

  calendar.render();
});

// 🟩 イベント＋予約数を読み込む
async function loadCalendarData() {
  // イベント取得
  const { data: eventData, error: eventError } = await supabase
    .from("calendar_events")
    .select("title, date");

  // 予約数取得
  const { data: reservationData, error: resError } = await supabase
    .from("trybe_reservations")
    .select("date, nickname");

  if (eventError || resError) {
    console.error("Error fetching data:", eventError || resError);
    return [];
  }

  // 日ごとの予約人数を集計
  const countMap = {};
  reservationData.forEach(r => {
    countMap[r.date] = (countMap[r.date] || 0) + 1;
  });

  // イベント＋予約数をまとめて表示
  return eventData.map(e => ({
    title: `${e.title}（${countMap[e.date] || 0}名）`,
    start: e.date
  }));
}
