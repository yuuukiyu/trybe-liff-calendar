// notify.js
export async function sendLineMessage(userId, message) {
  const CHANNEL_ACCESS_TOKEN =
    "M9DY7der18lLq4mJ0X+ZKSHsKDbD8lRz9XtsQJQ5gdw+ECk1PdDvqEKohkCaSTptStCAL6GPiRVH2DIe+4PoRxP2CRG54dVMPuBj+Pzl1uzlGCgHd6jdWDPlgLnv4mpGFDot3f71YOGc8CouDQ/WnwdB04t89/1O/w1cDnyilFU=";

  try {
    const body = {
      to: userId,
      messages: [{ type: "text", text: message }],
    };

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("LINE APIエラー:", errText);
    } else {
      console.log("✅ 通知送信成功:", message);
    }
  } catch (err) {
    console.error("通知送信失敗:", err);
  }
}
