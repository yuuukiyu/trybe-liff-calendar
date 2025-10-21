import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase設定
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");

  // 🟩 イベント＋予約データを結合して読み込み
  const events = await loadCalendarData();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events,

    // 🔹 日付クリック処理
    dateClick: async function (info) {
      const date = info.dateStr;

      // ① まずその日の参加者を取得
      const { data: reservations, error } = await supabase
        .from("trybe_reservations")
        .select("nickname, status")
        .eq("date", date)
        .eq("status", "reserved");

      if (error) {
        alert("❌ 参加者取得エラー：" + error.message);
        return;
      }

      // ② 参加者リストを整形
      let participants = reservations.map(r => `・${r.nickname}`).join("\n");
      if (!participants) participants = "（まだ参加者はいません）";

      // ③ ダイアログで表示＋新規予約確認
      const action = confirm(
        `📅 ${date} の参加者一覧\n\n${participants}\n\nこの日に参加予約をしますか？`
      );

      if (action) {
        const nickname = prompt("あなたの名前を入力してください：");
        if (!nickname) return;

        const { error: insertError } = await supabase
          .from("trybe_reservations")
          .insert([{ date, nickname, status: "reserved" }]);

        if (insertError) {
          alert("❌ 登録に失敗：" + insertError.message);
        } else {
          alert("✅ 予約が完了しました！");
          location.reload();
        }
      }
    },
  });

  calendar.render();
});

// 🟩 カレンダーに表示するイベント＋参加者数
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
  reservationData.forEach((r) => {
    countMap[r.date] = (countMap[r.date] || 0) + 1;
  });

  // イベント＋人数を統合して返す
  return eventData.map((e) => ({
    title: `${e.title}（${countMap[e.date] || 0}名）`,
    start: e.date,
  }));
}
