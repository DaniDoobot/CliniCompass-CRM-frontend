/**
 * Hook para cargar y gestionar la lista de chats de doobot.
 * Polling cada 5 s con detección LOCAL de mensajes nuevos
 * comparando LastMessageID entre polls.
 */
import { useState as useReactState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllChats,
  changeMode as apiChangeMode,
  changeStatus as apiChangeStatus,
  hideConversation,
  showConversation,
  markAsRead as apiMarkAsRead,
  markAsUnread,
  type ChatItem,
} from "@/lib/doobotApi";

// ── Global state shared across all hook instances ──
// Tracks the last known LastMessageID per conversation
const knownLastMsgId = new Map<string, string>();
// Conversations with detected new activity (not yet viewed by user)
const globalNewActivity = new Set<string>();
// Currently selected conversation (won't trigger notifications)
let currentlyViewedConversation: string | null = null;
// Listeners to notify when newActivity changes
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

// ── Notification sound using Web Audio API ──
let audioCtx: AudioContext | null = null;
function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
    osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.1); // E6
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch {
    // Audio not available, silently ignore
  }
}

// ── Browser desktop notification ──
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showDesktopNotification(names: string[]) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const body = names.length === 1
    ? `Nuevo mensaje de ${names[0]}`
    : `Nuevos mensajes de ${names.join(", ")}`;
  const n = new Notification("CRM — Mensaje nuevo", {
    body,
    icon: "/favicon.png?v=3",
    tag: "doobot-new-msg", // reuse same notification
  });
  setTimeout(() => n.close(), 5_000);
}

// Request permission on first load
if (typeof window !== "undefined") requestNotificationPermission();

function detectNewMessages(chats: ChatItem[]) {
  let changed = false;
  const newNames: string[] = [];

  for (const chat of chats) {
    const id = chat.ConversationID;
    if (!id) continue;
    const currentMsgId = chat.LastMessageID ?? "";
    const prevMsgId = knownLastMsgId.get(id);

    if (prevMsgId !== undefined && currentMsgId && prevMsgId !== currentMsgId) {
      // Skip if user is currently viewing this conversation
      if (id === currentlyViewedConversation) {
        knownLastMsgId.set(id, currentMsgId);
        continue;
      }
      globalNewActivity.add(id);
      newNames.push(chat.ClientAlias || chat.ClientPhone || "Desconocido");
      changed = true;
    }
    if (currentMsgId) knownLastMsgId.set(id, currentMsgId);
  }

  if (changed) {
    playNotificationSound();
    showDesktopNotification(newNames);
    notifyListeners();
  }
}

export function setViewedConversation(conversationId: string | null) {
  currentlyViewedConversation = conversationId;
}

export function clearNewActivity(conversationId: string) {
  if (globalNewActivity.has(conversationId)) {
    globalNewActivity.delete(conversationId);
    notifyListeners();
  }
}

/** Manually mark a conversation as unread (e.g. from context menu) */
export function addNewActivity(conversationId: string) {
  if (!globalNewActivity.has(conversationId)) {
    globalNewActivity.add(conversationId);
    notifyListeners();
  }
}

/**
 * Custom hook that subscribes to the global newActivity set and
 * re-renders when it changes.
 */
export function useNewActivity(): ReadonlySet<string> {
  const [, setTick] = useReactState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return globalNewActivity;
}

export function useDoobotChats(showArchived: boolean = false, enabled: boolean = true) {
  const qc = useQueryClient();
  const key = ["doobot-chats", showArchived ? 1 : 0];

  const query = useQuery<ChatItem[]>({
    queryKey: key,
    queryFn: () => fetchAllChats(showArchived ? 1 : 0),
    refetchInterval: enabled ? 5_000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 3_000,
    enabled,
  });

  // Detect new messages on each successful fetch
  const prevDataRef = useRef<ChatItem[] | null>(null);
  useEffect(() => {
    if (!query.data || query.data === prevDataRef.current) return;
    prevDataRef.current = query.data;
    detectNewMessages(query.data);
  }, [query.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["doobot-chats"] });

  const toggleMode = useMutation({
    mutationFn: ({ id, currentMode }: { id: string; currentMode: string }) => {
      return apiChangeMode(id, currentMode);
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiChangeStatus(id, status),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (id: string) => hideConversation(id),
    onSuccess: invalidate,
  });

  const unarchive = useMutation({
    mutationFn: (id: string) => showConversation(id),
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiMarkAsRead(id),
    onSuccess: invalidate,
  });

  const markUnread = useMutation({
    mutationFn: (id: string) => markAsUnread(id),
    onSuccess: invalidate,
  });

  return {
    chats: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    toggleMode,
    setStatus,
    archive,
    unarchive,
    markRead,
    markUnread,
  };
}
