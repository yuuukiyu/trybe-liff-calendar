import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// ===== Supabase設定 =====
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xoN3ouBTMqfSxKHwkpkmfg_4JwRIL-z";
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
    window.LINE_NAME = profile.displayName;
    console.log("✅ LINEログイン:", window.LINE_NAME);

    await initCalendar();
    await showAdminPanel(); // ← 管理者モーダル表示
  } catch (err) {
    console.error("❌ LIFF初期化エラー:", err);
  }
});

// ===== カレンダー初期化 =====
async function initCalendar() {
  const calendarEl = document.getElementById("calendar");

  const { data: events, error } = await supabase.from("events").select("*");
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
      extendedProps: { time: e.time, place: e.place },
    })),
    eventClick: (info) => openModal(info.event),
  });

  calendar.render();
  await loadMySessions(events);
}

// ===== あなたの予約セッション一覧 =====
async function loadMySessions(events) {
  const list = document.getElementById("mySessionList");
  list.innerHTML = "<li>読み込み中...</li>";

  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("date, status")
    .eq("user_id", window.LINE_USER_ID)
    .eq("status", "reserved");

  if (resError) {
    console.error("予約一覧取得エラー:", resError.message);
    list.innerHTML = "<li>読み込み失敗しました。</li>";
    return;
  }

  list.innerHTML = "";
  if (!reservations || reservations.length === 0) {
    list.innerHTML = "<li>現在予約はありません。</li>";
    return;
  }

  reservations.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const r of reservations) {
    const event = events.find((e) => e.date === r.date);
    const title = event?.title || "（不明なイベント）";
    const time = event?.time || "";
    const place = event?.place || "";

    const { count } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("date", r.date)
      .eq("status", "reserved");

    const li = document.createElement("li");
    li.innerHTML = `
      📅 ${r.date} ${time}｜${title}（${place}）<br>
      👥 参加者：${count || 0}人
    `;
    li.style.marginBottom = "12px";
    list.appendChild(li);
  }
}

// ===== モーダル（イベント詳細） =====
async function openModal(event) {
  const modal = document.getElementById("modal");
  const modalTitle = document.getElementById("modalTitle");
  const participantList = document.getElementById("participantList");
  const nameInput = document.getElementById("nameInput");
  const joinBtn = document.getElementById("joinBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  const { title, extendedProps } = event;
  const { time, place } = extendedProps;

  modalTitle.textContent = `${title}｜${event.startStr}`;
  participantList.innerHTML = "";

  const { data: reservations, error } = await supabase
    .from("reservations")
    .select("user_id, user_name, status")
    .eq("date", event.startStr)
    .eq("status", "reserved");

  if (error) {
    participantList.innerHTML = "<li>参加者の取得に失敗しました。</li>";
    console.error(error.message);
    return;
  }

  const count = reservations?.length || 0;
  const header = document.createElement("p");
  header.innerHTML = `👥 参加者 <strong>${count}人</strong>`;
  participantList.appendChild(header);

  reservations?.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r.user_name;
    participantList.appendChild(li);
  });

  nameInput.value = window.LINE_NAME || "";
  modal.style.display = "flex";

  const userReserved = reservations.some(
    (r) => r.user_id === window.LINE_USER_ID
  );

  joinBtn.style.display = userReserved ? "none" : "inline-block";
  cancelBtn.style.display = userReserved ? "inline-block" : "none";

  joinBtn.onclick = async () => {
    const { error } = await supabase.from("reservations").insert([
      {
        user_id: window.LINE_USER_ID,
        user_name: window.LINE_NAME,
        date: event.startStr,
        event_id: event.id,
        status: "reserved",
      },
    ]);
    if (error) alert("登録エラー: " + error.message);
    else {
      alert("✅ 予約しました！");
      modal.style.display = "none";
      location.reload();
    }
  };

  cancelBtn.onclick = async () => {
    const { error } = await supabase
      .from("reservations")
      .update({ status: "canceled" })
      .eq("user_id", window.LINE_USER_ID)
      .eq("date", event.startStr);
    if (error) alert("キャンセルエラー: " + error.message);
    else {
      alert("🚫 キャンセルしました");
      modal.style.display = "none";
      location.reload();
    }
  };

  document.getElementById("closeBtn").onclick = () =>
    (modal.style.display = "none");
}

// ===== 管理者モーダル =====
async function showAdminPanel() {
  const ADMIN_LINE_IDS = [
    "U491a0406fff27c1dfbcf5a9046d11b3a",
    "U98a9bd633e9362a39fc4da2937d2a89f",
  ];

  if (!ADMIN_LINE_IDS.includes(window.LINE_USER_ID)) return;

  const openBtn = document.getElementById("openAdminModalBtn");
  const modal = document.getElementById("adminModal");
  const closeBtn = document.getElementById("closeAdminModalBtn");
  const addBtn = document.getElementById("addEventBtn");

  openBtn.style.display = "inline-block";

  openBtn.onclick = () => (modal.style.display = "flex");
  closeBtn.onclick = () => (modal.style.display = "none");

  addBtn.onclick = async () => {
    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    const time = document.getElementById("eventTime").value;
    const place = document.getElementById("eventPlace").value.trim();

    if (!title || !date || !time || !place) {
      alert("すべての項目を入力してください。");
      return;
    }

    const { error } = await supabase.from("events").insert([
      { title, date, time, place },
    ]);

    if (error) {
      alert("登録エラー: " + error.message);
    } else {
      alert("✅ 新しいセッションを追加しました！");
      modal.style.display = "none";
      location.reload();
    }
  };

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}
