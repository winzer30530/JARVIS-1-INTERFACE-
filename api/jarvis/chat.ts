export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const endpoint = process.env.JARVIS_API_URL;
  const apiKey = process.env.JARVIS_API_KEY;
  if (!endpoint || !apiKey) {
    return res.status(503).json({ error: "JARVIS server connection is not configured." });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Please enter a message." });
  if (message.length > 12000) return res.status(413).json({ error: "Message is too long (12,000 characters maximum)." });

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "x-api-key": apiKey,
        "x-jarvis-api-key": apiKey
      },
      body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(55000)
    });
    const raw = await upstream.text();
    let data: any;
    try { data = raw ? JSON.parse(raw) : {}; }
    catch { data = { text: raw }; }

    if (!upstream.ok) {
      const detail = data?.error || data?.message || `JARVIS AI service returned ${upstream.status}.`;
      return res.status(upstream.status).json({ error: detail });
    }
    return res.status(200).json(data);
  } catch (error: any) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? "JARVIS took too long to respond. Please try again." : "Could not reach the JARVIS AI service."
    });
  }
}
