"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useDashboardData } from "@/lib/dashboard/DashboardContext";
import { WidgetEmpty } from "./WidgetStates";
import { Button } from "@/components/ui/button";

/* ---------------------------------------------------------------- Notes */

export function Notes() {
  const { ticker, companyName } = useDashboardData();
  const key = `investorai:notes:${(ticker ?? companyName ?? "_").toLowerCase()}`;
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValue(window.localStorage.getItem(key) ?? "");
  }, [key]);

  const onChange = (v: string) => {
    setValue(v);
    setSaved(false);
    if (typeof window !== "undefined") window.localStorage.setItem(key, v);
    setSaved(true);
  };

  if (!ticker && !companyName)
    return <WidgetEmpty label="Analyze a company to take notes" />;

  return (
    <div className="flex h-full flex-col">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your private notes on this company…"
        className="min-h-0 flex-1 resize-none rounded-lg border border-border bg-background-secondary p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-border-strong"
      />
      <span className="mt-1.5 text-[11px] text-muted-foreground">
        {saved ? "Saved locally" : ""}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- AI Chat */

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export function AIChat() {
  const { research, companyName } = useDashboardData();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const context = research
        ? `Analysis:\n${research.analysis}\n\nFinancials:\n${research.financialData}\n\nNews:\n${research.newsData}`
        : "";
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, question: q, context }),
      });
      const json = await res.json();
      const answer = res.ok ? json.answer : json.error || "Something went wrong.";
      setMessages((m) => [...m, { role: "assistant", content: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network error — please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-xs text-muted-foreground">
            <span>Ask anything about {companyName ?? "this company"}.</span>
            <span className="opacity-70">e.g. &quot;What are the biggest risks?&quot;</span>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-hover text-foreground"
                : "bg-background-secondary text-foreground/90"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask a follow-up…"
          className="h-9 flex-1 rounded-md border border-border bg-background-secondary px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-border-strong"
        />
        <Button size="icon" onClick={send} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
