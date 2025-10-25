export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { userId, message } = req.body; // ← req.json() ではなく req.body

    const CHANNEL_ACCESS_TOKEN =
      "M9DY7der18lLq4mJ0X+ZKSHsKDbD8lRz9XtsQJQ5gdw+ECk1PdDvqEKohkCaSTptStCAL6GPiRVH2DIe+4PoRxP2CRG54dVMPuBj+Pzl1uzlGCgHd6jdWDPlgLnv4mpGFDot3f71YOGc8CouDQ/WnwdB04t89/1O/w1cDnyilFU=";

    const result = await fetch("https://api.line.me/v2/bot/message/push", {
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

    const text = await result.text();
    console.log("LINE通知結果:", text);
    res.status(result.status).json({ text });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
