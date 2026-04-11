"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";

type RoleplayMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type SentPayload = {
  model: string;
  temperature: number;
  max_tokens: number;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

type RoleplaySandboxProps = {
  initialInstructions?: string;
};

const MAX_PREVIOUS_TURNS = 10;

function createMessageId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function RoleplaySandbox({
  initialInstructions = "",
}: RoleplaySandboxProps) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<RoleplayMessage[]>([]);
  const [lastSentPayload, setLastSentPayload] = useState<SentPayload | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const canSend = useMemo(() => draft.trim().length > 0 && !isSending, [draft, isSending]);
  const turnCount = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );

  async function sendMessage() {
    const nextUserMessage = draft.trim();

    if (!nextUserMessage || isSending) {
      return;
    }

    const userMessage: RoleplayMessage = {
      id: createMessageId("user"),
      role: "user",
      content: nextUserMessage,
    };

    const nextMessages = [...messages, userMessage];
    const recentMessages = nextMessages.slice(-MAX_PREVIOUS_TURNS * 2);
    const requestMessages = [
      ...(instructions.trim()
        ? [
            {
              role: "user" as const,
              content: `[Roleplay Instructions]\n${instructions.trim()}`,
            },
          ]
        : []),
      ...recentMessages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    setMessages(nextMessages);
    setDraft("");
    setError("");
    setIsSending(true);
    setLastSentPayload(null);

    try {
      const response = await fetch("/api/roleplay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestMessages,
        }),
      });

      const data = (await response.json()) as {
        reply?: string;
        requestPayload?: SentPayload;
        error?: string;
      };

      const reply = typeof data.reply === "string" ? data.reply : "";

      if (!response.ok || !reply) {
        throw new Error(data.error || "The roleplay response failed.");
      }

      if (data.requestPayload) {
        setLastSentPayload(data.requestPayload);
      }

      setMessages((current) => [
        ...current,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          content: reply,
        },
      ]);
    } catch (sendError) {
      setMessages(messages);
      setDraft(nextUserMessage);
      setError(
        sendError instanceof Error ? sendError.message : "The roleplay response failed.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage();
  }

  function handleClearChat() {
    setMessages([]);
    setDraft("");
    setError("");
    setLastSentPayload(null);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[23rem_minmax(0,1fr)]">
      <Card className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.28em] text-warm">Roleplay Sandbox</p>
          <h1 className="text-3xl font-semibold text-foreground">Instructions + chat</h1>
          <p className="text-sm leading-6 text-secondary">
            This is a separate sandbox for testing roleplay behavior without touching sessions or the story runtime.
          </p>
          <p className="text-sm font-medium text-foreground">Turn {turnCount}</p>
        </div>

          <Field
            label="Roleplay Instructions"
            hint="Whatever you put here will be sent as a visible user message at the top of the payload. There are no hidden system messages."
          >
          <Textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            className="min-h-64"
            placeholder="Example: You are a cold, possessive vampire lord speaking in lush gothic prose. Stay fully in character. Keep replies under 160 words."
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="ghost" onClick={handleClearChat} disabled={isSending}>
            Clear Chat
          </Button>
        </div>

        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-sm font-medium text-foreground">Last Sent Payload</p>
          <p className="text-sm leading-6 text-secondary">
            This shows the exact request body the sandbox sent to the roleplay API.
          </p>
          <pre className="max-h-80 overflow-auto rounded-xl border border-line/70 bg-night/40 p-4 text-xs leading-6 text-secondary">
            {JSON.stringify(
              lastSentPayload ?? {
                model: "",
                temperature: 0,
                max_tokens: 0,
                messages: [],
              },
              null,
              2,
            )}
          </pre>
        </div>
      </Card>

      <Card className="flex min-h-[70vh] flex-col gap-4">
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Chat</p>
            <p className="text-sm text-secondary">Turn {turnCount}</p>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line/70 bg-transparent p-5">
              <p className="text-sm leading-6 text-secondary">
                Start chatting when you’re ready. The current instruction block will be sent with each turn.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-3xl rounded-2xl border px-4 py-3 ${
                  message.role === "user"
                    ? "ml-auto border-accent/30 bg-accent/10"
                    : "border-line/70 bg-night/40"
                }`}
              >
                <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted">
                  {message.role === "user" ? "You" : "Assistant"}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                  {message.content}
                </p>
              </div>
            ))
          )}

          {isSending ? (
            <div className="rounded-2xl border border-line/70 bg-night/40 px-4 py-3">
              <p className="text-sm text-secondary">Thinking...</p>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 border-t border-line pt-4">
          <Field label="Message" className="gap-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();

                  if (canSend) {
                    void sendMessage();
                  }
                }
              }}
              className="min-h-28"
              placeholder="Write your next message..."
            />
          </Field>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSend}>
              {isSending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
