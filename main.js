// ===== Supabase設定 =====
const SUPABASE_URL = "https://axeoezwxjjnghtyfmjnz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_xoN3ouBTMqfSxKHwkpkmfg_4JwRIL-z";

// CDNで読み込んだ UMD 版を使用
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== LIFF設定 =====
const LIFF_ID = "2008316836-YLR2y1Zj";

// 管理者LINE ID
const ADMIN_LINE_IDS = [
  "U491a0406fff27c1dfbcf5a9046d11b3a",
  "U98a9bd633e9362a39fc4da2937d2a89f",
];

// ===== アプリ開始 =====
window.addEventListener("DOMContentLoaded", async () => {

  console.log("DOMContentLoaded: JS 開始");

  // --- ① Supabase を動的 import ---
  const supa = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
  supabase = supa.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // --- ② LINE通知関数の動的 import ---
  const notify = await import("./notify.js");
  sendLineMessage = notify.sendLineMessage;

  // --- ③ LIFF 初期化 ---
  await startApp();
});

// ===== LIFF + カレンダー初期化 =====
async function startApp() {
  try {
    await liff.init({ liffId: LIFF_ID });
    console.log("LIFF Ready");

    if (!liff.isLoggedIn()) {
      console.log("LIFF → Login");
      return liff.login();
    }

    const profile = await liff.getProfile();
    window.LINE_USER_ID = profile.userId;
    window.LINE_NAME = profile.displayName;
    console.log("ログイン中:", window.LINE_NAME);

    // カレンダー初期化
    await initCalendar();

    // 管理者表示
    if (ADMIN_LINE_IDS.includes(window.LINE_USER_ID)) {
      document.getElementById("openAdminModalBtn").style.display = "inline-block";
      setupAdminButtons();
    }

  } catch (err) {
    console.error("❌ LIFF初期化エラー:", err);
  }
}

// ===== カレンダー初期化 =====
async function initCalendar() {
  const calendarEl = document.getElementById("calendar");
  console.log("calendarEl:", calendarEl);

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
    list.innerHTML = "<li>読み込み失敗しました。</li>";
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const futureReservations = reservations.filter((r) => r.date >= today);

  list.innerHTML = "";
  if (!futureReservations.length) {
    list.innerHTML = "<li>現在予約はありません。</li>";
    return;
  }

  futureReservations.sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const r of futureReservations) {
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

// ===== 以下：モーダル・管理者UI・削除など（あなたのコードそのまま）=====
