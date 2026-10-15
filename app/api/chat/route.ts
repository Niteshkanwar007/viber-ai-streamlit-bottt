import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

function demoReply(message: string) {
  const m = message.toLowerCase();
  if (/(human|person|agent|support team|representative)/.test(m)) {
    return "I can flag this for a human team member. In this demo, no real support ticket is created yet. In a connected deployment, this is where the handoff would create a ticket or notify your team.";
  }
  if (/(book|booking|appointment|schedule|reservation)/.test(m)) {
    return "I can help you start a booking. To continue, please share the service you need and your preferred date. This preview does not access a live booking calendar, so no appointment will be created.";
  }
  if (/(price|cost|fee|payment|refund)/.test(m)) {
    return "I can help explain pricing, but I don't have a verified price list connected in this demo. Share the service or item you're asking about, and a production version should check an approved knowledge source before quoting a price.";
  }
  if (/(hello|hi|hey|good morning|good evening)/.test(m)) {
    return "Hello! I can answer common questions, guide a booking conversation, and identify when a human handoff is needed. What would you like help with?";
  }
  if (/(what can|help|capabilities|do you do)/.test(m)) {
    return "This assistant demo can handle common questions, gather basic booking intent, and identify human-handoff requests. It is not connected to live customer records or booking systems yet.";
  }
  return "Thanks for your message. I can help clarify the request and suggest a next step. This deployment is in demo mode, so I won't invent account details or claim an action was completed. Could you share a little more context about what you need?";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body.history) ? body.history as ChatMessage[] : [];
    if (!message) return NextResponse.json({ error: "Enter a message first." }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: "Keep messages under 2,000 characters." }, { status: 413 });

    const key = process.env.GROQ_API_KEY;
    if (!key) return NextResponse.json({ reply: demoReply(message), mode: "Demo fallback" });

    const safeHistory = history.slice(-8).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a concise, respectful customer-support assistant. Never claim to have completed bookings, payments, refunds, or support tickets unless a connected tool confirms it. If asked for a human, explain that handoff is not configured in this demo. Do not invent company policies, prices, or account information. Ask one focused follow-up when needed." },
          ...safeHistory
        ],
        temperature: 0.3,
        max_tokens: 350
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Groq request failed:", response.status, detail.slice(0, 500));
      return NextResponse.json({ error: "The AI provider request failed. Check GROQ_API_KEY and GROQ_MODEL in the deployment settings." }, { status: 502 });
    }
    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) return NextResponse.json({ error: "The AI provider returned an empty response." }, { status: 502 });
    return NextResponse.json({ reply: reply.trim(), mode: "Groq API" });
  } catch (error) {
    console.error("Chat route error:", error);
    return NextResponse.json({ error: "Could not process this message. Please retry." }, { status: 500 });
  }
}