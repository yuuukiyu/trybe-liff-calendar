import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ===== Supabase設定 =====
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZW9lend4ampuZ2h0eWZtam56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NTE2NjQsImV4cCI6MjA3NjQyNzY2NH0.79UMcuggtqTpbghbXkjtR8g2FYGSTbpasHBd6hcf2Gw";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== LIFF設定 =====
const LIFF_ID = "2008316836-YLR2y1Zj";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    window.LINE_USER_ID = profile.userId;
    window.LINE_NAME   = profile.displayName;
    console.log("✅ LINEログイン:", window.LINE_NAME);

    await initCalendar();
  } catch (err) {
    console.error("LIFF初期化エラー:", err);
  }
});

async function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  const { data: events, error } = await supabase.from("calendar_events").select("*");
  if (error) {
    alert("イベント取得エラー: " + error.message);
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "ja",
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      start: e.date,
    })),
    eventClick: (info) => openModal(info.event),
  });

  calendar.render();

  // あなたの予約一覧
  const { data: myReserves } = await supabase
    .from("reservations")
    .select("date, status")
    .eq("user_id", window.LINE_USER_ID)
    .eq("status", "reserved");

  const list = document.getElementById("mySessionList");
  list.innerHTML = "";

  if (!myReserves || myReserves.length === 0) {
    list.innerHTML = "<li>現在予約はありません。</li>";
  } else {
    myReserves.forEach((r) => {
      const li = document.createElement("li");
      li.textContent = `📅 ${r.date} ｜ 予約中`;
      list.appendChild(li);
    });
  }
}

async function openModal(event) {
  const modal          = document.getElementById("modal");
  const modalTitle     = document.getElementById("modalTitle");
  const participantList= document.getElementById("participantList");
  const nameInput      = document.getElementById("nameInput");

  modalTitle.textContent = `${event.title}｜${event.startStr} の参加者`;

  const { data: reservations } = await supabase
    .from("reservations")
    .select("user_name")
    .eq("date", event.startStr)
    .eq("status", "reserved");

  participantList.innerHTML = "";
  reservations?.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r.user_name;
    participantList.appendChild(li);
  });

  nameInput.value = window.LINE_NAME || "";
  modal.style.display = "flex";

  // 参加
  document.getElementById("joinBtn").onclick = async () => {
    const { error } = await supabase.from("reservations").insert([
      {
        user_id: window.LINE_USER_ID,
        user_name: window.LINE_NAME,
        date: event.startStr,
        status: "reserved",
      },
    ]);
    if (error) {
      alert("登録エラー: " + error.message);
    } else {
      alert("✅ 予約しました！");
      modal.style.display = "none";
      location.reload();
    }
  };

  // キャンセル
  document.getElementById("cancelBtn").onclick = async () => {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "canceled" })
      .eq("user_id", window.LINE_USER_ID)
      .eq("date", event.startStr);
    if (error) {
      alert("キャンセルエラー: " + error.message);
    } else {
      alert("🚫 キャンセルしました");
      modal.style.display = "none";
      location.reload();
    }
  };

  // 閉じる
  document.getElementById("closeBtn").onclick = () => {
    modal.style.display = "none";
  };
}
