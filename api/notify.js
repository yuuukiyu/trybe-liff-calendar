// /api/notify.js
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { userId, message } = req.body;

  // 🔒 Messaging API チャネルアクセストークン
  const CHANNEL_ACCESS_TOKEN =
    "M9DY7der18lLq4mJ0X+ZKSHsKDbD8lRz9XtsQJQ5gdw+ECk1PdDvqEKohkCaSTptStCAL6GPiRVH2DIe+4PoRxP2CRG54dVMPuBj+Pzl1uzlGCgHd6jdWDPlgLnv4mpGFDot3f71YOGc8CouDQ/WnwdB04t89/1O/w1cDnyilFU=";

  try {
    const lineRes = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text: message }],
      }),
    });

    const text = await lineRes.text();
    console.log("📨 LINE APIレスポンス:", lineRes.status, text);

    if (!lineRes.ok) {
      return res.status(lineRes.status).json({ ok: false, text });
    }

    return res.status(200).json({ ok: true, text });
  } catch (err) {
    console.error("❌ 通知送信失敗:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
