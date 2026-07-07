"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  MessageSquare,
  Send,
  X,
} from "lucide-react";
import {
  CONVERSATION_TOPIC_LABELS,
  type ConversationTopic,
} from "@/lib/types";
import { conversationPreview, conversationsForUser } from "@/lib/selectors";
import { ArrowRight } from "lucide-react";

const topicTone: Record<ConversationTopic, string> = {
  evaluation: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/50",
  journal: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50",
  concern: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50",
  practicum: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",
  general: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-700",
};

interface QuickComposePopoverProps {
  /** The role-specific messages view to navigate to. */
  messagesView: "supervisor.messages" | "coordinator.messages";
  /** Label for the CTA — e.g. "Message the Coordinator" or "Messages from Supervisors". */
  ctaLabel: string;
  /** The counterpart role label — e.g. "Coordinator" or "Supervisor". */
  counterpartLabel: string;
}

/**
 * A dashboard CTA card that opens a quick-compose popover.
 * Lets the user fire off a quick message to their counterpart
 * without leaving the dashboard. Also shows the latest conversation
 * preview + unread count, and a link to open the full Messages view.
 */
export function QuickComposePopover({
  messagesView,
  ctaLabel,
  counterpartLabel,
}: QuickComposePopoverProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const conversations = useAppStore((s) => s.conversations);
  const readConversationIds = useAppStore((s) => s.readConversationIds);
  const startConversation = useAppStore((s) => s.startConversation);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const navigate = useAppStore((s) => s.navigate);

  const [open, setOpen] = React.useState(false);
  const [topic, setTopic] = React.useState<ConversationTopic>("general");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const myConversations = React.useMemo(
    () => (currentUser ? conversationsForUser(conversations, currentUser.id) : []),
    [conversations, currentUser]
  );
  const latestConv = myConversations[0];

  // Unread = last message from other party + not in readConversationIds
  const unreadCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return myConversations.filter((c) => {
      const last = c.messages[c.messages.length - 1];
      return last && last.senderId !== currentUser.id && !readConversationIds.includes(c.id);
    }).length;
  }, [myConversations, currentUser, readConversationIds]);

  const counterpartId = currentUser?.role === "supervisor" ? "u-coord" : "u-supervisor";

  const handleSend = () => {
    if (!body.trim()) return;
    if (latestConv) {
      // Reply to the latest conversation
      sendMessage(latestConv.id, body);
    } else {
      // Start a new one
      startConversation({
        participantId: counterpartId,
        topic,
        title: title.trim() || `Quick message to ${counterpartLabel}`,
        body,
      });
    }
    setBody("");
    setTitle("");
    setTopic("general");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="card-refined is-interactive flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-left transition-colors hover:border-border"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700 ring-1 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/50">
            <MessageSquare className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-foreground">{ctaLabel}</p>
              {unreadCount > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-100 px-1 text-[10px] font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                  {unreadCount} new
                </span>
              )}
              <span className="truncate text-[11px] text-muted-foreground">
                {latestConv
                  ? `· ${conversationPreview(latestConv)}`
                  : `· Discuss evaluations, journals, and practicum updates`}
              </span>
            </div>
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 sm:w-[400px]"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {latestConv ? `Reply to ${counterpartLabel}` : `New message to ${counterpartLabel}`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {latestConv ? latestConv.title : "Start a new conversation"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-2.5 p-3">
          {!latestConv && (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Subject (optional)"
                className="h-8 w-full rounded-md border border-border/60 bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex flex-wrap gap-1">
                {(Object.keys(CONVERSATION_TOPIC_LABELS) as ConversationTopic[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTopic(t)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 transition-colors",
                      topic === t
                        ? topicTone[t]
                        : "bg-background text-muted-foreground ring-border/60 hover:bg-muted"
                    )}
                  >
                    {CONVERSATION_TOPIC_LABELS[t]}
                  </button>
                ))}
              </div>
            </>
          )}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Write a quick message to ${counterpartLabel}…`}
            rows={3}
            className="resize-none text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setOpen(false);
                navigate(messagesView);
              }}
            >
              Open full inbox
              <ArrowRight className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-8"
              disabled={!body.trim()}
              onClick={handleSend}
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default QuickComposePopover;
