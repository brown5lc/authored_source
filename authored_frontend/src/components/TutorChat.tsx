import { useEffect, useRef, useState } from "react";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a Socratic coding tutor embedded inside a student's Python IDE. The student is working on this assignment:

**Hello, Output!**
Write a Python program that prints three lines:
1. "Hello, World!"
2. Your name
3. The result of 7 + 3

Strict rules, never break these:
- NEVER write code for the student or complete their code
- NEVER give the direct answer
- Guide with questions: "What does print() do?", "What happens if you put text inside the parentheses?"
- If they're stuck, break the problem into the smallest possible next step
- Acknowledge what they've done correctly before pointing out what's wrong
- Be warm, encouraging, and concise — 1 to 3 sentences per reply
- If they paste code, ask them questions about it rather than fixing it

You can see their current code when they share it. Help them think, not copy.`;

type Message = { role: "user" | "assistant"; content: string };

function getClient() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY is not set in .env");
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export default function TutorChat({ currentCode, visible }: { currentCode: string; visible: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Anthropic.MessageParam[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    // Include current code snapshot in the message so tutor has context
    const userContent = `My current code:\n\`\`\`python\n${currentCode}\n\`\`\`\n\n${text}`;

    const userDisplay: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userDisplay]);
    setInput("");
    setError("");
    setBusy(true);
    setStreamingText("");

    historyRef.current.push({ role: "user", content: userContent });

    try {
      const client = getClient();
      const stream = client.messages.stream({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: historyRef.current,
      });

      let fullText = "";
      stream.on("text", (delta) => {
        fullText += delta;
        setStreamingText(fullText);
      });

      const finalMessage = await stream.finalMessage();
      const responseText =
        finalMessage.content.find((b) => b.type === "text")?.text ?? "";

      historyRef.current.push({ role: "assistant", content: responseText });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseText },
      ]);
      setStreamingText("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div
      style={{
        width: visible ? 280 : 0,
        minWidth: visible ? 280 : 0,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "#1a1a1a",
        borderRadius: visible ? 12 : 0,
        overflow: "hidden",
        border: visible ? "1px solid #2a2a2a" : "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#693ed6",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>
          AI Tutor
        </span>
        <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>
          Socratic mode
        </span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && !streamingText && (
          <p
            style={{
              fontSize: 13,
              color: "#444",
              textAlign: "center",
              marginTop: 24,
            }}
          >
            Ask me anything about the assignment. I won't give you the answer —
            but I'll help you find it.
          </p>
        )}

        {messages.map((msg, i) => (
          <Bubble key={i} role={msg.role} content={msg.content} />
        ))}

        {streamingText && (
          <Bubble role="assistant" content={streamingText} streaming />
        )}

        {busy && !streamingText && (
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 0",
              justifyContent: "center",
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#693ed6",
                  animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <p
            style={{
              fontSize: 12,
              color: "#f44336",
              background: "#2a1a1a",
              padding: "8px 10px",
              borderRadius: 6,
            }}
          >
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #2a2a2a" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            rows={2}
            style={{
              flex: 1,
              background: "#111",
              border: "1px solid #333",
              borderRadius: 8,
              padding: "8px 10px",
              color: "#ddd",
              fontSize: 13,
              resize: "none",
              fontFamily: "inherit",
              outline: "none",
            }}
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: busy || !input.trim() ? "#333" : "#693ed6",
              color: busy || !input.trim() ? "#555" : "white",
              cursor: busy || !input.trim() ? "not-allowed" : "pointer",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#444" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>

    </div>
  );
}

function Bubble({
  role,
  content,
  streaming,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "90%",
        background: isUser ? "#693ed6" : "#242424",
        color: isUser ? "white" : "#ccc",
        padding: "8px 12px",
        borderRadius: isUser ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
        fontSize: 13,
        lineHeight: 1.5,
        whiteSpace: "pre-wrap",
      }}
    >
      {content}
      {streaming && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "1em",
            background: "#693ed6",
            marginLeft: 2,
            verticalAlign: "text-bottom",
            animation: "pulse 0.8s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}
