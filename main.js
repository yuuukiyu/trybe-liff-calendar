// 🟩 Supabaseクライアント初期化
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🗓 ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");

  const events = await loadEvents(); // Supabaseからデータ取得

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events
  });

  calendar.render();
});

// 🔹 Supabaseからイベントを取得
async function loadEvents() {
  const { data, error } = await supabase
    .from("calendar_events") // ← 今回作ったテーブル名に変更
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
