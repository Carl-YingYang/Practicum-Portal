"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import {
  conversationsForUser,
  otherParticipantId,
  conversationPreview,
  unreadConversationCount,
  conversationMatchesSearch,
  formatDate,
  formatTime,
  relativeTime,
} from "@/lib/selectors";
import {
  CONVERSATION_TOPIC_LABELS,
  type Conversation,
  type ConversationTopic,
} from "@/lib/types";
import { mockUsers } from "@/lib/mock-data";
import { Avatar } from "@/components/portal/shared/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Send,
  MessageSquare,
  Plus,
  ArrowLeft,
  Search,
  X,
  Check,
  CheckCheck,
  Archive,
  ArchiveRestore,
  Trash2,
  MoreVertical,
  Inbox as InboxIcon,
  Filter,
} from "lucide-react";

const topicTone: Record<ConversationTopic, string> = {
  evaluation: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900/50",
  journal: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/50",
  concern: "bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/50",
  practicum: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/50",
  general: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:ring-slate-700",
};

type InboxTab = "active" | "archived";
type TopicFilter = ConversationTopic | "all";

/** Resolve a user id → display info (name + avatar color). */
function useUserLookup() {
  const supervisors = useAppStore((s) => s.supervisors);
  return React.useCallback((userId: string) => {
    const u = mockUsers.find((m) => m.id === userId);
    if (u) return { name: u.name, color: u.avatarColor, role: u.role };
    // Fallback to supervisor record
    const sup = supervisors.find((s) => `u-${s.id}` === userId || s.id === userId);
    if (sup) return { name: sup.name, color: "#d97706", role: "supervisor" as const };
    return { name: "User", color: "#475569", role: "coordinator" as const };
  }, [supervisors]);
}

export function MessagesView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const conversations = useAppStore((s) => s.conversations);
  const readConversationIds = useAppStore((s) => s.readConversationIds);
  const viewParams = useAppStore((s) => s.viewParams);
  const navigate = useAppStore((s) => s.navigate);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const startConversation = useAppStore((s) => s.startConversation);
  const markConversationRead = useAppStore((s) => s.markConversationRead);
  const archiveConversation = useAppStore((s) => s.archiveConversation);
  const unarchiveConversation = useAppStore((s) => s.unarchiveConversation);
  const deleteConversation = useAppStore((s) => s.deleteConversation);
  const supervisors = useAppStore((s) => s.supervisors);
  const lookup = useUserLookup();

  const [draft, setDraft] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [mobileThread, setMobileThread] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const [composeTopic, setComposeTopic] = React.useState<ConversationTopic>("general");
  const [composeTitle, setComposeTitle] = React.useState("");
  const [composeBody, setComposeBody] = React.useState("");
  const [inboxTab, setInboxTab] = React.useState<InboxTab>("active");
  const [topicFilter, setTopicFilter] = React.useState<TopicFilter>("all");

  const threadEndRef = React.useRef<HTMLDivElement>(null);

  const myConversations = React.useMemo(
    () => (currentUser ? conversationsForUser(conversations, currentUser.id) : []),
    [conversations, currentUser]
  );
  const unreadCount = currentUser
    ? unreadConversationCount(conversations, currentUser.id, readConversationIds)
    : 0;

  // Active conversation: from viewParams or first
  const activeId = viewParams.conversationId ?? myConversations[0]?.id;
  const activeConv = myConversations.find((c) => c.id === activeId);

  // Pre-fill compose form when navigated with a supervisorId (conversation linking)
  React.useEffect(() => {
    if (viewParams.supervisorId && currentUser?.role === "coordinator") {
      const sup = supervisors.find((s) => s.id === viewParams.supervisorId);
      if (sup) {
        setComposing(true);
        setComposeTitle(`Discussion about ${sup.name}`);
        setComposeTopic("general");
        setMobileThread(false);
      }
    }
  }, [viewParams.supervisorId, supervisors, currentUser?.role]);

  // Mark active conversation as read when it changes / on mount
  React.useEffect(() => {
    if (activeConv && currentUser) {
      const lastMsg = activeConv.messages[activeConv.messages.length - 1];
      if (lastMsg && lastMsg.senderId !== currentUser.id && !readConversationIds.includes(activeConv.id)) {
        markConversationRead(activeConv.id);
      }
    }
  }, [activeConv, currentUser, readConversationIds, markConversationRead]);

  // Auto-scroll thread to bottom on new messages / conversation switch
  React.useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConv?.messages.length, activeConv?.id]);

  if (!currentUser) return null;

  // Filter by tab (active/archived) + topic + full-text search
  const filtered = myConversations.filter((c) => {
    if (inboxTab === "active" && c.archivedAt) return false;
    if (inboxTab === "archived" && !c.archivedAt) return false;
    if (topicFilter !== "all" && c.topic !== topicFilter) return false;
    return conversationMatchesSearch(c, search);
  });

  const archivedCount = myConversations.filter((c) => c.archivedAt).length;
  const activeCount = myConversations.length - archivedCount;

  const handleSend = () => {
    if (!draft.trim() || !activeConv) return;
    sendMessage(activeConv.id, draft);
    setDraft("");
  };

  const handleStartConversation = () => {
    if (!composeTitle.trim() || !composeBody.trim()) return;
    // Find the counterpart: supervisor → coordinator, coordinator → first supervisor (sup1 for demo)
    const counterpartId =
      currentUser.role === "supervisor"
        ? "u-coord"
        : "u-supervisor";
    const id = startConversation({
      participantId: counterpartId,
      topic: composeTopic,
      title: composeTitle.trim(),
      body: composeBody,
    });
    setComposing(false);
    setComposeTitle("");
    setComposeBody("");
    setComposeTopic("general");
    setMobileThread(true);
    setInboxTab("active");
    // Navigate so the URL state reflects the new conversation
    navigate(
      currentUser.role === "supervisor" ? "supervisor.messages" : "coordinator.messages",
      { conversationId: id }
    );
  };

  const openConversation = (convId: string) => {
    navigate(
      currentUser.role === "supervisor" ? "supervisor.messages" : "coordinator.messages",
      { conversationId: convId }
    );
    setMobileThread(true);
  };

  const handleArchive = (convId: string) => {
    archiveConversation(convId);
    // If we archived the active conversation, clear the active id
    if (activeConv?.id === convId) {
      navigate(
        currentUser.role === "supervisor" ? "supervisor.messages" : "coordinator.messages",
        {}
      );
      setMobileThread(false);
    }
  };
  const handleUnarchive = (convId: string) => {
    unarchiveConversation(convId);
  };
  const handleDelete = (convId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Delete this conversation permanently? This action cannot be undone."
      )
    )
      return;
    deleteConversation(convId);
    if (activeConv?.id === convId) {
      navigate(
        currentUser.role === "supervisor" ? "supervisor.messages" : "coordinator.messages",
        {}
      );
      setMobileThread(false);
    }
  };

  const topicFilters: { value: TopicFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "evaluation", label: "Evaluation" },
    { value: "journal", label: "Journal" },
    { value: "concern", label: "Concern" },
    { value: "practicum", label: "Practicum" },
    { value: "general", label: "General" },
  ];

  return (
    <div className="flex h-[calc(100vh-9.5rem)] flex-col overflow-hidden rounded-xl border border-border/60 bg-card lg:h-[calc(100vh-8.5rem)]">
      {/* Two-pane layout */}
      <div className="flex min-h-0 flex-1">
        {/* Conversation list */}
        <div
          className={cn(
            "flex w-full flex-col border-r border-border/50 lg:w-[340px] lg:shrink-0",
            mobileThread && "hidden lg:flex"
          )}
        >
          {/* List header — inbox tabs */}
          <div className="border-b border-border/50 px-3 pt-2.5 pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
                <p className="text-[11px] text-muted-foreground">
                  {inboxTab === "active"
                    ? `${activeCount} conversation${activeCount === 1 ? "" : "s"}`
                    : `${archivedCount} archived`}
                  {unreadCount > 0 && inboxTab === "active" && (
                    <span className="ml-1 text-teal-700 dark:text-teal-300">· {unreadCount} unread</span>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant={composing ? "outline" : "default"}
                className="h-7 shrink-0"
                onClick={() => setComposing((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
            {/* Inbox tab toggle */}
            <div className="mt-2 flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5">
              <button
                onClick={() => setInboxTab("active")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  inboxTab === "active"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <InboxIcon className="h-3 w-3" />
                Active
                {unreadCount > 0 && (
                  <span className="flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-teal-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setInboxTab("archived")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors",
                  inboxTab === "archived"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Archive className="h-3 w-3" />
                Archived
                {archivedCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">({archivedCount})</span>
                )}
              </button>
            </div>
          </div>

          {/* Search + topic filter */}
          <div className="border-b border-border/50 px-3 py-2.5 space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages, titles, names…"
                className="h-8 w-full rounded-md border border-border/60 bg-background pl-7 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {/* Topic filter chips — only show on active tab */}
            {inboxTab === "active" && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <Filter className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                {topicFilters.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTopicFilter(tf.value)}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                      topicFilter === tf.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compose form (collapsible) */}
          {composing && (
            <div className="border-b border-border/50 bg-muted/30 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">New conversation</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setComposing(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <input
                value={composeTitle}
                onChange={(e) => setComposeTitle(e.target.value)}
                placeholder="Subject (e.g. Juan Dela Cruz — evaluation)"
                className="mb-2 h-8 w-full rounded-md border border-border/60 bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="mb-2 flex flex-wrap gap-1">
                {(Object.keys(CONVERSATION_TOPIC_LABELS) as ConversationTopic[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setComposeTopic(t)}
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-medium ring-1 transition-colors",
                      composeTopic === t
                        ? topicTone[t]
                        : "bg-background text-muted-foreground ring-border/60 hover:bg-muted"
                    )}
                  >
                    {CONVERSATION_TOPIC_LABELS[t]}
                  </button>
                ))}
              </div>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Write your message…"
                rows={3}
                className="mb-2 resize-none text-xs"
              />
              <Button
                size="sm"
                className="h-7 w-full"
                disabled={!composeTitle.trim() || !composeBody.trim()}
                onClick={handleStartConversation}
              >
                <Send className="h-3.5 w-3.5" />
                Send to {currentUser.role === "supervisor" ? "Coordinator" : "Supervisor"}
              </Button>
            </div>
          )}

          {/* List */}
          <div className="min-h-0 flex-1 overflow-y-auto scroll-area-custom">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  {search || topicFilter !== "all"
                    ? "No matches"
                    : inboxTab === "archived"
                    ? "No archived conversations"
                    : "No conversations"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search || topicFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : inboxTab === "archived"
                    ? "Conversations you archive will appear here."
                    : `Start a new conversation with the ${
                        currentUser.role === "supervisor" ? "coordinator" : "supervisor"
                      }.`}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {filtered.map((c) => {
                  const otherId = otherParticipantId(c, currentUser.id);
                  const other = lookup(otherId);
                  const lastMsg = c.messages[c.messages.length - 1];
                  const isUnread =
                    lastMsg &&
                    lastMsg.senderId !== currentUser.id &&
                    !readConversationIds.includes(c.id);
                  const isActive = activeConv?.id === c.id;
                  return (
                    <li
                      key={c.id}
                      className="group relative"
                    >
                      <button
                        onClick={() => openConversation(c.id)}
                        className={cn(
                          "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                          isActive ? "bg-primary/8" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="relative">
                          <Avatar name={other.name} size="sm" color={other.color} />
                          {isUnread && (
                            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-teal-500 ring-2 ring-card" />
                          )}
                          {c.archivedAt && (
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200 text-slate-600 ring-2 ring-card dark:bg-slate-700 dark:text-slate-300">
                              <Archive className="h-2 w-2" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("truncate text-xs", isUnread ? "font-bold text-foreground" : "font-semibold text-foreground")}>
                              {other.name}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {relativeTime(c.lastMessageAt)}
                            </span>
                          </div>
                          <p className={cn("truncate text-[11px]", isUnread ? "font-medium text-foreground" : "text-muted-foreground")}>
                            {c.title}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {conversationPreview(c)}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            <span className={cn("inline-flex rounded px-1 py-0.5 text-[9px] font-medium ring-1", topicTone[c.topic])}>
                              {CONVERSATION_TOPIC_LABELS[c.topic]}
                            </span>
                          </div>
                        </div>
                      </button>
                      {/* Hover actions */}
                      <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <ConversationMenu
                          conversation={c}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          onDelete={handleDelete}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Thread pane */}
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            !mobileThread && "hidden lg:flex"
          )}
        >
          {activeConv ? (
            <ThreadPane
              conversation={activeConv}
              currentUserId={currentUser.id}
              lookup={lookup}
              draft={draft}
              setDraft={setDraft}
              onSend={handleSend}
              onBack={() => setMobileThread(false)}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDelete}
              threadEndRef={threadEndRef}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <MessageSquare className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold text-foreground">
                {inboxTab === "archived" ? "No archived conversation selected" : "Select a conversation"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                {inboxTab === "archived"
                  ? "Choose an archived conversation to view its history, or unarchive it to continue the chat."
                  : "Choose a conversation from the list to view the message thread, or start a new one."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ConversationMenuProps {
  conversation: Conversation;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

function ConversationMenu({
  conversation,
  onArchive,
  onUnarchive,
  onDelete,
}: ConversationMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/60 backdrop-blur hover:bg-background hover:text-foreground"
          aria-label="Conversation actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        {conversation.archivedAt ? (
          <DropdownMenuItem
            onClick={() => onUnarchive(conversation.id)}
            className="gap-2 text-xs"
          >
            <ArchiveRestore className="h-3.5 w-3.5" />
            Unarchive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => onArchive(conversation.id)}
            className="gap-2 text-xs"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(conversation.id)}
          className="gap-2 text-xs text-destructive focus:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ThreadPaneProps {
  conversation: Conversation;
  currentUserId: string;
  lookup: (id: string) => { name: string; color: string; role: string };
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  threadEndRef: React.RefObject<HTMLDivElement | null>;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= startOfToday) return "Today";
  if (t >= startOfYesterday) return "Yesterday";
  // Same calendar week — show weekday
  const diffDays = (startOfToday - t) / (24 * 60 * 60 * 1000);
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }
  return formatDate(iso);
}

function ThreadPane({
  conversation,
  currentUserId,
  lookup,
  draft,
  setDraft,
  onSend,
  onBack,
  onArchive,
  onUnarchive,
  onDelete,
  threadEndRef,
}: ThreadPaneProps) {
  const otherId = otherParticipantId(conversation, currentUserId);
  const other = lookup(otherId);

  // Group messages by day (Today / Yesterday / weekday / date)
  const groups: { day: string; messages: typeof conversation.messages }[] = [];
  for (const m of conversation.messages) {
    const day = dayLabel(m.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) {
      last.messages.push(m);
    } else {
      groups.push({ day, messages: [m] });
    }
  }

  // Pre-compute, for each message, whether it has been "read" by the counterpart.
  // Heuristic (MVP): my message is "read" if any later message in the conversation
  // was sent by the counterpart (i.e., they replied after it).
  const readMessageIds = new Set<string>();
  const msgs = conversation.messages;
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.senderId !== currentUserId) continue;
    for (let j = i + 1; j < msgs.length; j++) {
      if (msgs[j].senderId !== currentUserId) {
        readMessageIds.add(m.id);
        break;
      }
    }
  }

  const isArchived = !!conversation.archivedAt;

  return (
    <>
      {/* Thread header */}
      <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 lg:hidden"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar name={other.name} size="sm" color={other.color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{other.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {conversation.title}
          </p>
        </div>
        <span className={cn("inline-flex shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ring-1", topicTone[conversation.topic])}>
          {CONVERSATION_TOPIC_LABELS[conversation.topic]}
        </span>
        <ConversationMenu
          conversation={conversation}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onDelete={onDelete}
        />
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto scroll-area-custom bg-muted/20 px-4 py-4">
        <div className="mx-auto max-w-2xl space-y-4">
          {isArchived && (
            <div className="mx-auto flex max-w-md items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
              <Archive className="h-3.5 w-3.5 shrink-0" />
              <span>This conversation is archived. Unarchive it to continue the discussion.</span>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.day}>
              <div className="mb-2 flex justify-center">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {g.day}
                </span>
              </div>
              <div className="space-y-2">
                {g.messages.map((m, mIdx) => {
                  const mine = m.senderId === currentUserId;
                  const sender = lookup(m.senderId);
                  const isRead = readMessageIds.has(m.id);
                  // Show the read receipt only on the LAST message I sent in a group run.
                  const isLastMineInRun =
                    mine &&
                    (mIdx === g.messages.length - 1 ||
                      g.messages[mIdx + 1].senderId !== currentUserId);
                  return (
                    <div
                      key={m.id}
                      className={cn("flex items-end gap-2", mine ? "flex-row-reverse" : "")}
                    >
                      {!mine && <Avatar name={sender.name} size="xs" color={sender.color} />}
                      <div className={cn("max-w-[78%]", mine ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "rounded-xl px-3 py-2 text-sm",
                            mine
                              ? "rounded-br-sm bg-primary text-primary-foreground"
                              : "rounded-bl-sm bg-card border border-border/60 text-foreground"
                          )}
                        >
                          {m.body}
                        </div>
                        <p className={cn("mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground", mine ? "justify-end text-right" : "text-left")}>
                          <span>{formatTime(m.createdAt)}</span>
                          {mine && isLastMineInRun && (
                            isRead ? (
                              <CheckCheck className="h-3 w-3 text-teal-600 dark:text-teal-400" aria-label="Read" />
                            ) : (
                              <Check className="h-3 w-3 text-muted-foreground/70" aria-label="Sent" />
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={threadEndRef} />
        </div>
      </div>

      {/* Compose — disabled when archived */}
      <div className="border-t border-border/50 bg-card p-3">
        {isArchived ? (
          <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Archive className="h-3.5 w-3.5" />
            <span>Archived — unarchive to send a reply.</span>
          </div>
        ) : (
          <>
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                rows={1}
                className="min-h-[40px] max-h-32 resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={!draft.trim()}
                onClick={onSend}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mx-auto mt-1.5 max-w-2xl text-center text-[10px] text-muted-foreground">
              Press Enter to send · Shift+Enter for a new line
            </p>
          </>
        )}
      </div>
    </>
  );
}

export default MessagesView;
