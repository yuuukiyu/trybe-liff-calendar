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

// ===== 管理者専用セッション追加 =====
async function showAdminPanel() {
  if (ADMIN_LINE_IDS.includes(window.LINE_USER_ID)) {
    const adminSection = document.getElementById("adminSection");
    adminSection.style.display = "block";

    // ✅ セッション追加ボタンは既存のまま
    const addEventBtn = document.getElementById("addEventBtn");
    addEventBtn.onclick = async () => {
      const title = document.getElementById("eventTitle").value.trim();
      const date = document.getElementById("eventDate").value;
      const time = document.getElementById("eventTime").value;
      const place = document.getElementById("eventPlace").value.trim();

      if (!title || !date || !time || !place) {
        alert("すべての項目を入力してください。");
        return;
      }

      const { error } = await supabase.from("events").insert([{ title, date, time, place }]);
      if (error) {
        alert("登録エラー: " + error.message);
      } else {
        alert("✅ 新しいセッションを追加しました！");
        location.reload();
      }
    };

    // ✅ セッション削除ボタンを追加
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑 セッション削除";
    deleteBtn.style.marginTop = "10px";
    deleteBtn.onclick = openDeleteSessionModal;
    adminSection.appendChild(deleteBtn);
  }
}

// ===== 管理者専用セッション削除 =====
async function openDeleteSessionModal() {
  const modal = document.getElementById("deleteSessionModal");
  const list = document.getElementById("deleteSessionList");
  modal.style.display = "flex";
  list.innerHTML = "<li>読み込み中...</li>";

  // Supabaseからイベント一覧取得
  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, date, time, place")
    .order("date", { ascending: true });

  if (error) {
    list.innerHTML = "<li>取得エラー: " + error.message + "</li>";
    return;
  }

  if (!events || events.length === 0) {
    list.innerHTML = "<li>登録されているセッションはありません。</li>";
    return;
  }

  list.innerHTML = "";

  events.forEach((e) => {
    const li = document.createElement("li");
    li.innerHTML = `
      📅 ${e.date} ${e.time}｜${e.title}（${e.place}）
      <button class="small-delete" data-id="${e.id}" style="margin-left:10px;">削除</button>
    `;
    list.appendChild(li);
  });

  // 各削除ボタン処理
  document.querySelectorAll(".small-delete").forEach((btn) => {
    btn.onclick = async () => {
      const eventId = btn.getAttribute("data-id");
      const confirmDelete = confirm("このセッションを削除しますか？\n予約者データも全て削除されます。");
      if (!confirmDelete) return;

      // reservationsも削除
      const { error: resErr } = await supabase
        .from("reservations")
        .delete()
        .eq("event_id", eventId);

      // イベント削除
      const { error: evErr } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (resErr || evErr) {
        alert("削除エラー: " + (resErr?.message || evErr?.message));
      } else {
        alert("🗑 セッションを削除しました！");
        openDeleteSessionModal(); // 再読み込み
      }
    };
  });

  // 閉じる
  document.getElementById("closeDeleteModal").onclick = () => {
    modal.style.display = "none";
  };
}

