export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "Use POST." });
  }
  const apiUrl = process.env.JARVIS_API_URL;
  const apiKey = process.env.JARVIS_API_KEY;
  if (!apiUrl || !apiKey) {
    return res.status(503).json({ error: "NOT_CONFIGURED", message: "JARVIS chat connection is not configured on the server." });
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "INVALID_MESSAGE", message: "Type a message first." });
  if (message.length > 12000) return res.status(413).json({ error: "MESSAGE_TOO_LONG", message: "Messages must be 12,000 characters or fewer." });
  try {
    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ message })
    });
    const raw = await upstream.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = { message: raw || "The AI service returned an unreadable response." }; }
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "JARVIS could not reach its AI service. Please try again." });
  }
}
