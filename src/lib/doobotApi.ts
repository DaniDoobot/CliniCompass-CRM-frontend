/**
 * Cliente HTTP para la API de doobot.
 *
 * ⚠️  Todas las llamadas pasan por el proxy de Vite (/api/doobot) en desarrollo.
 *     En producción, este path debe enrutar a una Edge Function proxy o a Nginx.
 *     Ver TODO de producción en doobotConfig.ts.
 *
 * Las cookies de sesión se gestionan automáticamente con credentials: "include".
 *
 * ENCAPSULACIÓN: Todas las llamadas a doobot deben pasar por este módulo.
 * No llamar directamente a doobot desde componentes o páginas.
 */

import { DOOBOT_API_BASE, META_TOKEN, META_PHONE_ID, CONSOLE_ID } from "./doobotConfig";

// =========================================================
// TIPOS
// =========================================================
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

// =========================================================
// HEADERS
// =========================================================
const whatsappHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${META_TOKEN}`,
  Accept: "application/json",
});

const jsonHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Accept: "application/json",
});

// =========================================================
// LOGIN
// =========================================================
export async function doobotLogin(name: string, pass: string): Promise<LoginResponse> {
  const res = await fetch(`${DOOBOT_API_BASE}/user/login?_format=json`, {
    method: "POST",
    headers: jsonHeaders(),
    credentials: "include",
    body: JSON.stringify({ name, pass }),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Login failed: ${res.status}. ${errorText}`);
  }
  return res.json();
}

// =========================================================
// LISTA DE CHATS
// =========================================================
export async function fetchChats(
  showHidden: number = 0,
  page: number = 0,
  pageSize: number = 50
): Promise<ChatItem[]> {
  const body = new URLSearchParams({
    Order: "%5B%5D",
    Page: String(page),
    PageSize: String(pageSize),
    SowOwn: "0",
    ShowAll: "0",
    Console: CONSOLE_ID,
    Manager: "",
    Owner: "",
  });

  const res = await fetch(
    `${DOOBOT_API_BASE}/whatsapp/list/${META_PHONE_ID}/${showHidden}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...whatsappHeaders(),
      },
      credentials: "include",
      body: body.toString(),
    }
  );
  if (!res.ok) throw new Error(`fetchChats failed: ${res.status}`);
  return res.json();
}

/** Descarga todas las páginas de chats hasta que no haya más. */
export async function fetchAllChats(showHidden: number = 0): Promise<ChatItem[]> {
  const pageSize = 50;
  const maxPages = 50;
  const result: ChatItem[] = [];
  for (let page = 0; page < maxPages; page++) {
    const items = await fetchChats(showHidden, page, pageSize);
    result.push(...items);
    if (items.length < pageSize) break;
  }
  return result;
}

// =========================================================
// MENSAJES
// =========================================================
export async function fetchMessages(
  conversationId: string,
  page: number = 0,
  pageSize: number = 50
): Promise<MessageListResponse> {
  const body = new URLSearchParams({
    Page: String(page),
    PageSize: String(pageSize),
    SuperAdmin: "",
  });

  const res = await fetch(`${DOOBOT_API_BASE}/whatsapp/get/${conversationId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...whatsappHeaders(),
    },
    credentials: "include",
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`fetchMessages failed: ${res.status}`);
  return res.json();
}

// =========================================================
// GUARDAR MENSAJE
// =========================================================
export async function saveMessage(params: {
  conversationId: string;
  who?: string;
  type: string;
  body: string;
  externalMessageId?: string;
  setAutoMode?: boolean;
  archivedFromPanel?: number;
}): Promise<ApiResponse> {
  const formData = new URLSearchParams({
    ConversationID: params.conversationId,
    Who: params.who ?? "PANEL",
    Type: params.type,
    Body: params.body,
    ExternalMessageID: params.externalMessageId ?? "",
    SetAutoMode: String(params.setAutoMode ?? false),
    ArchivedFromPanel: String(params.archivedFromPanel ?? 0),
  });

  const res = await fetch(`${DOOBOT_API_BASE}/whatsapp/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...whatsappHeaders(),
    },
    credentials: "include",
    body: formData.toString(),
  });
  if (!res.ok) throw new Error(`saveMessage failed: ${res.status}`);
  return res.json();
}

// =========================================================
// GESTIÓN DE CONVERSACIÓN
// =========================================================
async function doobotGet(path: string): Promise<ApiResponse> {
  const res = await fetch(`${DOOBOT_API_BASE}${path}`, {
    method: "GET",
    headers: whatsappHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export const changeMode = (id: string, currentMode: string) =>
  doobotGet(`/whatsapp/change-mode/${id}/${currentMode}`);

export const changeStatus = (id: string, status: string) =>
  doobotGet(`/whatsapp/change-status/${id}/${status}`);

export const hideConversation = (id: string) =>
  doobotGet(`/whatsapp/hide/${id}`);

export const showConversation = (id: string) =>
  doobotGet(`/whatsapp/visible/${id}`);

export const markAsRead = (id: string) =>
  doobotGet(`/whatsapp/read/${id}`);

export const changeCampaign = (id: string, campaign: string) =>
  doobotGet(`/whatsapp/change-campaign/${id}/${encodeURIComponent(campaign)}`);

export const changeManager = (id: string) =>
  doobotGet(`/whatsapp/change-manager/${id}/`);

export const changeBot = (id: string, bot: string) =>
  doobotGet(`/whatsapp/change-bot/${id}/${encodeURIComponent(bot)}`);

export const changeTimeZone = (id: string, tz: string) =>
  doobotGet(`/whatsapp/change-time-zone/${id}/${encodeURIComponent(tz)}`);

export const changeContact = (id: string, contact: string) =>
  doobotGet(`/whatsapp/change-contact/${id}/${encodeURIComponent(contact)}`);

export const changeAlias = (id: string, alias: string) =>
  doobotGet(`/whatsapp/change-name/${id}/${encodeURIComponent(alias)}`);

// =========================================================
// MANAGERS
// =========================================================
export async function getManagerList(): Promise<ManagerItem[]> {
  const res = await fetch(`${DOOBOT_API_BASE}/whatsapp/get-manager-list`, {
    method: "GET",
    headers: whatsappHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`getManagerList failed: ${res.status}`);
  return res.json();
}
