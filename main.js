import "@line/liff";

const LIFF_ID = "2008316836-YLR2y1Zj"; // ← あなたのLIFF ID

// LIFF初期化
liff.init({ liffId: LIFF_ID })
  .then(async () => {
    if (!liff.isLoggedIn()) {
      liff.login();
    } else {
      const profile = await liff.getProfile();
      window.LINE_USER_ID = profile.userId;
      window.LINE_NAME = profile.displayName;
      console.log("LINEログイン成功:", profile.displayName);
    }
  })
  .catch((err) => console.error("LIFF初期化エラー:", err));

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase接続設定
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";

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

  let events = [];
  let calendar;

  // ===== イベントと人数をロード =====
  async function loadEvents() {
    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("*");

    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select("*")
      .eq("status", "reserved");

    if (eventsError || resError) {
      console.error(eventsError || resError);
      alert("データ取得エラー");
      return [];
    }

    // イベントごとに参加人数を集計
    const eventCounts = {};
    reservations.forEach((r) => {
      if (!eventCounts[r.date]) eventCounts[r.date] = 0;
      eventCounts[r.date]++;
    });

    return eventsData.map((e) => ({
      id: e.id,
      title: `${e.title}（${eventCounts[e.date] || 0}名）`,
      start: e.date,
    }));
  }

  // ===== カレンダー初期化 =====
  async function renderCalendar() {
    events = await loadEvents();
    if (calendar) calendar.destroy();

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "ja",
      events: events,
      dateClick: (info) => {
        const event = events.find((e) => e.start === info.dateStr);
        if (!event) return; // 予定なし日は無反応
        openModal(event);
      },
    });

    calendar.render();
  }

  // ===== モーダル表示 =====
  async function openModal(event) {
    modal.style.display = "flex";
    modalTitle.textContent = `${event.title.split("（")[0]}｜${event.start} の参加者`;

    const { data: reservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", event.start)
      .eq("status", "reserved");

    participantList.innerHTML =
      reservations && reservations.length > 0
        ? reservations.map((r) => `<li>${r.user_name}</li>`).join("")
        : "<li>まだ参加者はいません</li>";

    joinBtn.onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) return alert("名前を入力してください");

      const { error } = await supabase.from("reservations").insert([
        { user_name: name, date: event.start, status: "reserved" },
      ]);

      if (error) return alert("登録エラー: " + error.message);
      alert("✅ 参加登録しました！");
      modal.style.display = "none";
      await renderCalendar(); // 即更新
    };

    cancelBtn.onclick = async () => {
      const name = nameInput.value.trim();
      if (!name) return alert("名前を入力してください");

      const { error } = await supabase
        .from("reservations")
        .update({ status: "canceled" })
        .eq("user_name", name)
        .eq("date", event.start);

      if (error) return alert("キャンセル失敗: " + error.message);
      alert("❌ キャンセルしました");
      modal.style.display = "none";
      await renderCalendar(); // 即更新
    };

    closeBtn.onclick = () => (modal.style.display = "none");
  }

  // ===== 初回レンダー =====
  await renderCalendar();

  // ===== Supabaseリアルタイム購読 =====
  supabase
    .channel("realtime:reservations")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reservations" },
      async () => {
        await renderCalendar(); // 他ユーザー変更も即反映
      }
    )
    .subscribe();
});
