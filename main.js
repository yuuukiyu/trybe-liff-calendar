import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🟩 Supabase設定
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const events = await loadCalendarData();

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events,

    // 🟦 日付クリック時の処理
    dateClick: async function (info) {
      const date = info.dateStr;

      // ① Supabaseから当日の予約データ取得
      const { data: reservations, error } = await supabase
        .from("trybe_reservations")
        .select("id, nickname, status")
        .eq("date", date);

      if (error) {
        alert("❌ データ取得エラー：" + error.message);
        return;
      }

      // ② 表示用リスト生成（reservedのみ）
      const activeMembers = reservations
        .filter((r) => r.status === "reserved")
        .map((r) => `・${r.nickname}`)
        .join("\n");

      const listText =
        activeMembers || "（まだ参加者はいません）";

      // ③ 自分の予約確認
      const nickname = prompt(
        `📅 ${date} の参加者一覧\n\n${listText}\n\nあなたの名前を入力してください：`
      );
      if (!nickname) return;

      const existing = reservations.find(
        (r) => r.nickname === nickname && r.status === "reserved"
      );

      // ④ すでに予約してる場合 → キャンセル確認
      if (existing) {
        const cancel = confirm(
          `🚫 ${nickname} さんはこの日に既に予約しています。\nキャンセルしますか？`
        );
        if (cancel) {
          const { error: cancelError } = await supabase
            .from("trybe_reservations")
            .update({ status: "canceled" })
            .eq("id", existing.id);

          if (cancelError) alert("❌ キャンセル失敗：" + cancelError.message);
          else alert("✅ キャンセル完了！");
          location.reload();
        }
        return;
      }

      // ⑤ 新規予約登録
      const confirmReserve = confirm(
        `✅ ${nickname} さんとして ${date} に予約しますか？`
      );
      if (confirmReserve) {
        const { error: insertError } = await supabase
          .from("trybe_reservations")
          .insert([{ date, nickname, status: "reserved" }]);

        if (insertError) {
          alert("❌ 登録失敗：" + insertError.message);
        } else {
          alert("✅ 予約が完了しました！");
          location.reload();
        }
      }
    },
  });

  calendar.render();
});

// 🟩 イベント＋予約データをカレンダーに統合
async function loadCalendarData() {
  const { data: eventData, error: eventError } = await supabase
    .from("calendar_events")
    .select("title, date");

  const { data: reservationData, error: resError } = await supabase
    .from("trybe_reservations")
    .select("date, status");

  if (eventError || resError) {
    console.error("Error fetching data:", eventError || resError);
    return [];
  }

  // 🔸 有効な予約数だけカウント
  const countMap = {};
  reservationData
    .filter((r) => r.status === "reserved")
    .forEach((r) => {
      countMap[r.date] = (countMap[r.date] || 0) + 1;
    });

  return eventData.map((e) => ({
    title: `${e.title}（${countMap[e.date] || 0}名）`,
    start: e.date,
  }));
}
