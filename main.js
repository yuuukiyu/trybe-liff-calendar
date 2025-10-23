import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase接続設定
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const participantList = document.getElementById("participantList");
  const nameInput = document.getElementById("nameInput");
  const joinBtn = document.getElementById("joinBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const closeBtn = document.getElementById("closeBtn");

  // イベントロード
  const { data: events, error } = await supabase.from("events").select("*");
  if (error) {
    alert("イベント取得エラー: " + error.message);
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.date,
    })),
    dateClick: function(info) {
      // 該当日にイベントがあるかチェック
      const event = events.find(e => e.date === info.dateStr);
      if (!event) return; // 予定がない日はクリック無効

      openModal(event);
    },
  });

  calendar.render();

  // モーダル開く
  async function openModal(event) {
    modal.style.display = "flex";
    modalTitle.textContent = `${event.title} | ${event.date} の参加者`;

    // 予約一覧取得
    const { data: reservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", event.date)
      .eq("status", "reserved");

    participantList.innerHTML =
      reservations && reservations.length > 0
        ? reservations.map(r => `<li>${r.user_name}</li>`).join("")
        : "<li>まだ参加者はいません</li>";

    joinBtn.onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert("名前を入力してください");
        return;
      }
      await supabase.from("reservations").insert([
        { user_name: name, date: event.date, status: "reserved" },
      ]);
      alert("✅ 予約しました！");
      modal.style.display = "none";
      location.reload();
    };

    cancelBtn.onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        alert("名前を入力してください");
        return;
      }
      await supabase
        .from("reservations")
        .update({ status: "canceled" })
        .eq("user_name", name)
        .eq("date", event.date);
      alert("❌ キャンセルしました");
      modal.style.display = "none";
      location.reload();
    };

    closeBtn.onclick = () => (modal.style.display = "none");
  }
});
