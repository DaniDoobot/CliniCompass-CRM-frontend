/**
 * Cliente para la consola WhatsApp/Doobot.
 *
 * Todas las llamadas van a través de la Edge Function `console-api`.
 * No existen llamadas directas a Doobot ni credenciales en el frontend.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Invoke helper ──────────────────────────────────────────────────────
async function invoke<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("console-api", {
    body: { action, ...params },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.data as T;
}

// ── Tipos ──────────────────────────────────────────────────────────────
export interface ChatItem {
  ConversationID: string | null;
  ExternalID: string | null;
  BotPhoneID: string | null;
  ClientPhoneID: string | null;
  BotPhone: string | null;
  ClientPhone: string | null;
  ClientAlias: string | null;
  Mode: string | null;
  Status: string | null;
  LastMessageID: string | null;
  LastMessageManagerID: string | null;
  LastMessageTimestamp: string | null;
  MessagesNoRead: string | null;
  CampaignDate: string | null;
  Campaign: string | null;
  Intent: string | null;
  Manager: string | null;
  ManagerID: string | null;
  Owner: string | null;
  Contact: string | null;
  TimeZone: string | null;
  BotProjectID: string | null;
  Hidden: string | null;
}

export interface MessageItem {
  MessageID: string | null;
  ExternalID: string | null;
  ConversationID: string | null;
  Who: string | null;
  Type: string | null;
  Body: string | null;
  Status: string | null;
  SentTimestamp: string | null;
  DeliveredTimestamp: string | null;
  ReadTimestamp: string | null;
  ErrorCode: string | null;
  ErrorMessage: string | null;
  CreationDate: string | null;
}

export interface MessageListResponse {
  status: string | null;
  messages: MessageItem[] | null;
}

export interface ManagerItem {
  ManagerID: string;
  Name: string;
  Email: string;
}

export interface ApiResponse {
  status: string;
  manager?: string;
}

export interface LoginResponse {
  current_user?: { uid: string; name: string };
  csrf_token?: string;
  logout_token?: string;
}

// ── Chats ──────────────────────────────────────────────────────────────
export async function fetchChats(
  showHidden = 0,
  page = 0,
  pageSize = 50
): Promise<ChatItem[]> {
  return invoke("doobot:chats", { showHidden, page, pageSize });
}

export async function fetchAllChats(showHidden = 0): Promise<ChatItem[]> {
  return invoke("doobot:all-chats", { showHidden });
}

// ── Mensajes ───────────────────────────────────────────────────────────
export async function fetchMessages(
  conversationId: string,
  page = 0,
  pageSize = 50
): Promise<MessageListResponse> {
  return invoke("doobot:messages", { conversationId, page, pageSize });
}

// ── Guardar mensaje ────────────────────────────────────────────────────
export async function saveMessage(params: {
  conversationId: string;
  who?: string;
  type: string;
  body: string;
  externalMessageId?: string;
  setAutoMode?: boolean;
  archivedFromPanel?: number;
}): Promise<ApiResponse> {
  return invoke("doobot:save", {
    conversationId: params.conversationId,
    who: params.who ?? "PANEL",
    type: params.type,
    body: params.body,
    externalMessageId: params.externalMessageId ?? "",
    setAutoMode: params.setAutoMode ?? false,
    archivedFromPanel: params.archivedFromPanel ?? 0,
  });
}

// ── Gestión de conversación ────────────────────────────────────────────
const change = (cmd: string, id: string, value?: string): Promise<ApiResponse> =>
  invoke("doobot:change", { cmd, id, value });

export const changeMode = (id: string, currentMode: string) =>
  change("mode", id, currentMode.toUpperCase() === "AUTO" ? "MANUAL" : "AUTO");

export const changeStatus = (id: string, status: string) =>
  change("status", id, status);

export const hideConversation = (id: string) => change("hide", id);
export const showConversation = (id: string) => change("visible", id);
export const markAsRead = (id: string) => change("read", id);
export const markAsUnread = (id: string) => change("unread", id);

export const changeCampaign = (id: string, campaign: string) =>
  change("campaign", id, campaign);

export const changeManager = (id: string) => change("manager", id);
export const changeBot = (id: string, bot: string) => change("bot", id, bot);
export const changeTimeZone = (id: string, tz: string) => change("timezone", id, tz);
export const changeContact = (id: string, contact: string) => change("contact", id, contact);
export const changeAlias = (id: string, alias: string) => change("alias", id, alias);

// ── Managers ───────────────────────────────────────────────────────────
export async function getManagerList(): Promise<ManagerItem[]> {
  return invoke("doobot:managers");
}
