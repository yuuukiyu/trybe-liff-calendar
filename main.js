import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let selectedDate = null;

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const events = await loadCalendarData();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events,
    dateClick: async function (info) {
      const eventExists = events.some((e) => e.start === info.dateStr);
      if (!eventExists) return; // ✅ 予定なし日付は押下無効

      selectedDate = info.dateStr;
      openModal(info.dateStr);
    },
  });

  calendar.render();
});

// 🟦 イベント・予約データ取得
async function loadCalendarData() {
  const { data: eventData } = await supabase.from("calendar_events").select("title, date");
  const { data: reservationData } = await supabase.from("trybe_reservations").select("date, status");

  const countMap = {};
  reservationData
    .filter((r) => r.status === "reserved")
    .forEach((r) => (countMap[r.date] = (countMap[r.date] || 0) + 1));

  return eventData.map((e) => ({
    title: `${e.title}（${countMap[e.date] || 0}名）`,
    start: e.date,
  }));
}

// 🟩 モーダル表示
async function openModal(date) {
  const modal = document.getElementById("modal");
  const titleEl = document.getElementById("modal-title");
  const listEl = document.getElementById("member-list");

  const { data: reservations } = await supabase
    .from("trybe_reservations")
    .select("nickname, status")
    .eq("date", date);

  const members = reservations
    .filter((r) => r.status === "reserved")
    .map((r) => `・${r.nickname}`)
    .join("<br>") || "（参加者なし）";

  titleEl.innerHTML = `📅 ${date} の参加者一覧`;
  listEl.innerHTML = members;
  modal.style.display = "block";
}

// 🟥 モーダル操作
document.getElementById("close-btn").onclick = () =>
  (document.getElementById("modal").style.display = "none");

document.getElementById("reserve-btn").onclick = async () => {
  const nickname = document.getElementById("nickname-input").value.trim();
  if (!nickname) return alert("名前を入力してください");

  const { error } = await supabase
    .from("trybe_reservations")
    .insert([{ date: selectedDate, nickname, status: "reserved" }]);

  if (error) alert("登録失敗：" + error.message);
  else {
    alert("✅ 予約完了！");
    location.reload();
  }
};

document.getElementById("cancel-btn").onclick = async () => {
  const nickname = document.getElementById("nickname-input").value.trim();
  if (!nickname) return alert("名前を入力してください");

  const { data, error } = await supabase
    .from("trybe_reservations")
    .update({ status: "canceled" })
    .eq("date", selectedDate)
    .eq("nickname", nickname);

  if (error) alert("キャンセル失敗：" + error.message);
  else {
    alert("🚫 キャンセル完了！");
    location.reload();
  }
};
