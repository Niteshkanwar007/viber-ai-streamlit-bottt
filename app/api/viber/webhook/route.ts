import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function validSignature(rawBody: string, signature: string, token: string) {
  const expected = createHmac("sha256", token).update(rawBody).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "hex"); } catch { return false; }
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function createReply(text: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "Thanks for your message. This Viber webhook is connected in demo fallback mode. Add GROQ_API_KEY to enable AI-generated replies.";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful Viber customer-support bot. Be concise. Never claim to complete bookings, payments, refunds, or tickets without a verified integration. Do not invent account information or policies." },
          { role: "user", content: text.slice(0, 2000) }
        ],
        temperature: 0.3,
        max_tokens: 250
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) return "I received your message, but I'm having trouble generating a reply right now. Please try again shortly.";
    const data = await res.json();
    return typeof data?.choices?.[0]?.message?.content === "string" ? data.choices[0].message.content.trim() : "I received your message. Could you please try again?";
  } catch {
    return "I received your message, but I'm temporarily unable to reply. Please try again shortly.";
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "/api/viber/webhook",
    configured: Boolean(process.env.VIBER_AUTH_TOKEN),
    note: "Register this public endpoint with Viber only after configuring VIBER_AUTH_TOKEN."
  });
}

export async function POST(request: Request) {
  const token = process.env.VIBER_AUTH_TOKEN;
  if (!token) return NextResponse.json({ error: "Viber webhook is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-viber-content-signature") || "";
  if (!signature || !validSignature(rawBody, signature, token)) {
    return NextResponse.json({ error: "Invalid Viber signature." }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody);
    if (event?.event === "webhook") return NextResponse.json({ status: 0, status_message: "ok" });
    if (event?.event !== "message" || !event?.sender?.id || typeof event?.message?.text !== "string") {
      return NextResponse.json({ status: 0, status_message: "ignored" });
    }
    const reply = await createReply(event.message.text);
    const send = await fetch("https://chatapi.viber.com/pa/send_message", {
      method: "POST",
      headers: { "X-Viber-Auth-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver: event.sender.id,
        min_api_version: 7,
        sender: { name: process.env.VIBER_BOT_NAME || "AI Assistant" },
        type: "text",
        text: reply.slice(0, 7000)
      }),
      signal: AbortSignal.timeout(15000)
    });
    if (!send.ok) {
      console.error("Viber send_message failed:", send.status, (await send.text()).slice(0, 300));
      return NextResponse.json({ status: 0, status_message: "reply delivery failed" });
    }
    return NextResponse.json({ status: 0, status_message: "ok" });
  } catch (error) {
    console.error("Viber webhook processing error:", error);
    return NextResponse.json({ status: 0, status_message: "processing error" });
  }
}