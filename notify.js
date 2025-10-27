// notify.js
export async function sendLineMessage(userId, message) {
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message }),
    });

    const data = await res.json();
    console.log("📬 通知結果:", data);
  } catch (err) {
    console.error("通知エラー:", err);
  }
}
