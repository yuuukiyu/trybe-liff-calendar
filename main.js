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

  // ✅ カレンダー描画後に自分の予約セッション読み込み
  await loadMySessions(events);
}

// ===== あなたの予約セッション一覧を表示 =====
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

    // ✅ 日付を YYYY-MM-DD に揃える
    const dateOnly = new Date(r.date).toISOString().split("T")[0];

    // ✅ 同じ日付の参加人数を取得
    const { count, error: countError } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("date", dateOnly)
      .eq("status", "reserved");

    if (countError) console.error("人数取得エラー:", countError.message);

    const li = document.createElement("li");
    li.innerHTML = `
      📅 ${r.date} ${time}｜${title}（${place}）<br>
      👥 参加者：${count || 0}人
    `;
    li.style.marginBottom = "12px";
    list.appendChild(li);
  }
}

// ===== モーダル表示処理 =====
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

  // ✅ このイベントの予約者リストを取得
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

  // ✅ 参加者数を表示
  const count = reservations?.length || 0;
  const header = document.createElement("p");
  header.innerHTML = `👥 参加者 <strong>${count}人</strong>`;
  header.style.marginBottom = "10px";
  participantList.appendChild(header);

  // ✅ 参加者一覧
  reservations?.forEach((r) => {
    const li = document.createElement("li");
    li.textContent = r.user_name;
    participantList.appendChild(li);
  });

  nameInput.value = window.LINE_NAME || "";
  modal.style.display = "flex";

  // ✅ このユーザーがすでに予約済みかチェック
  const userReserved = reservations.some(
    (r) => r.user_id === window.LINE_USER_ID
  );

  // ✅ ボタン表示を切り替え
  if (userReserved) {
    joinBtn.style.display = "none";
    cancelBtn.style.display = "inline-block";
  } else {
    joinBtn.style.display = "inline-block";
    cancelBtn.style.display = "none";
  }

  // ===== 予約ボタン =====
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

  // ===== キャンセルボタン =====
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

  // 閉じるボタン
  document.getElementById("closeBtn").onclick = () => {
    modal.style.display = "none";
  };
}
