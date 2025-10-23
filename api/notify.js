// api/notify.js
export default async function handler(req, res) {
  const { userName, action } = req.query;

  const message =
    action === "cancel"
      ? `🚫 ${userName}さんが予約をキャンセルしました`
      : `✅ ${userName}さんが予約しました！`;

  try {
    await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_CHANNEL_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [{ type: "text", text: message }],
      }),
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("LINE通知エラー:", error);
    res.status(500).json({ error: "LINE通知に失敗しました" });
  }
}
