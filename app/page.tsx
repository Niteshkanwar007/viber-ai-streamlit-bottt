"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const starters = [
  "What can this bot help me with?",
  "I need help with a booking.",
  "Can I speak to a human?"
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I’m the Viber AI assistant demo. Ask a question or try one of the suggested messages. This preview can run in demo mode without an API key." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("Demo fallback");
  const [error, setError] = useState("");

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next); setInput(""); setLoading(true); setError("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history: next.slice(-8) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Message failed.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
      setMode(data.mode || "Demo fallback");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send message.");
    } finally { setLoading(false); }
  }

  function submit(e: FormEvent) { e.preventDefault(); void send(input); }

  return <main className="page">
    <header className="topbar"><a className="logo" href="#"><span className="logoicon">v</span><span>viber<span className="logoaccent">.ai</span></span></a><div className="topright"><span className="status"><i/> ONLINE PREVIEW</span><span className="version">BUILD 0.1</span></div></header>
    <section className="intro"><div className="kicker">CONVERSATION LAB / 01</div><h1>A helpful answer.<br/><em>Without the wait.</em></h1><p>Test a lightweight AI assistant flow before connecting a real Viber account. The demo supports local fallback responses and optional server-side Groq inference.</p></section>
    <section className="layout">
      <div className="chatbox">
        <div className="chathead"><div className="avatar">V<span>✦</span></div><div className="botidentity"><strong>Viber Assistant</strong><small><i/> Ready to help</small></div><span className="chatdots">•••</span></div>
        <div className="messages" aria-live="polite">
          {messages.map((m,i)=><div key={i} className={"message-row "+(m.role==="user"?"from-user":"from-bot")}><div className="bubble">{m.content}</div></div>)}
          {loading && <div className="message-row from-bot"><div className="bubble typing"><i/><i/><i/></div></div>}
        </div>
        <div className="suggestions">{starters.map(s=><button key={s} onClick={()=>void send(s)} disabled={loading}>{s}</button>)}</div>
        <form className="composer" onSubmit={submit}><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Write a message…" aria-label="Message" maxLength={2000}/><button disabled={loading||!input.trim()} aria-label="Send message">↑</button></form>
        {error && <div className="error">{error}</div>}
        <div className="chatfoot">DEMO CONVERSATION · DO NOT ENTER SENSITIVE INFORMATION</div>
      </div>
      <aside className="side">
        <div className="sidecard"><div className="smallcap">RUNTIME STATUS</div><div className="runtime"><span className="runtime-dot"/><strong>{mode}</strong></div><p>{mode==="Groq API" ? "Responses are generated using the configured server-side Groq API key." : "The app is interactive now. Add GROQ_API_KEY in Vercel to enable model-backed replies."}</p></div>
        <div className="sidecard"><div className="smallcap">HOW THE DEMO WORKS</div><div className="stepitem"><span>01</span><div><strong>Message received</strong><p>Chat input is validated and sent to a server route.</p></div></div><div className="stepitem"><span>02</span><div><strong>Response selected</strong><p>Groq is used when configured; otherwise safe demo responses keep the flow testable.</p></div></div><div className="stepitem"><span>03</span><div><strong>Reply rendered</strong><p>The response appears in the conversation, ready for review.</p></div></div></div>
        <div className="sidecard integration"><div className="smallcap">VIBER CONNECTION</div><strong>Webhook endpoint included</strong><p>The deployment includes a Viber webhook route. Configure VIBER_AUTH_TOKEN and register the deployed endpoint with Viber before describing it as connected.</p><code>/api/viber/webhook</code></div>
      </aside>
    </section>
    <footer><span>VIBER.AI / DEMO ENVIRONMENT</span><span>Human handoff · Server-side secrets · Clear demo boundaries</span></footer>
  </main>;
}