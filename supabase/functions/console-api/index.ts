// console-api — Edge Function proxy para Doobot y Meta Graph API.
// Autentica con JWT de Supabase (CRM). Las credenciales de Doobot/Meta
// van en variables de entorno server-side, nunca en el frontend.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Variables de entorno server-side ──────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const DOOBOT_BASE = Deno.env.get("DOOBOT_BASE_URL") ?? "https://demo.doobot.ai";
const DOOBOT_USER = Deno.env.get("DOOBOT_USER") ?? "";
const DOOBOT_PASS = Deno.env.get("DOOBOT_PASS") ?? "";
const DOOBOT_CONSOLE_ID = Deno.env.get("DOOBOT_CONSOLE_ID") ?? "";
const META_PHONE_ID = Deno.env.get("META_PHONE_ID") ?? "";
const META_TOKEN = Deno.env.get("META_TOKEN") ?? "";

// ── Sesión Doobot (login por request — stateless) ─────────────────────
async function getDoobotCookie(): Promise<string> {
  const res = await fetch(`${DOOBOT_BASE}/user/login?_format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name: DOOBOT_USER, pass: DOOBOT_PASS }),
  });
  // 200 = login OK, 422 = sesión ya activa — ambos pueden devolver cookies
  const raw = res.headers.get("set-cookie") ?? "";
  return raw
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function doobotHeaders(cookie: string): HeadersInit {
  return {
    Authorization: `Bearer ${META_TOKEN}`,
    Accept: "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

// ── Helpers HTTP hacia Doobot ─────────────────────────────────────────
async function doobotGET(path: string, cookie: string): Promise<unknown> {
  const res = await fetch(`${DOOBOT_BASE}${path}`, {
    method: "GET",
    headers: doobotHeaders(cookie),
  });
  if (!res.ok) throw new Error(`Doobot GET ${path} → ${res.status}`);
  return res.json();
}

async function doobotPOST(
  path: string,
  body: URLSearchParams,
  cookie: string
): Promise<unknown> {
  const res = await fetch(`${DOOBOT_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...doobotHeaders(cookie),
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Doobot POST ${path} → ${res.status}`);
  return res.json();
}

// ── Handlers por acción ───────────────────────────────────────────────

async function actionChats(p: Record<string, unknown>, cookie: string) {
  const showHidden = Number(p.showHidden ?? 0);
  const page = Number(p.page ?? 0);
  const pageSize = Number(p.pageSize ?? 50);
  const body = new URLSearchParams({
    Order: "%5B%5D",
    Page: String(page),
    PageSize: String(pageSize),
    SowOwn: "0",
    ShowAll: "0",
    Console: DOOBOT_CONSOLE_ID,
    Manager: "",
    Owner: "",
  });
  return doobotPOST(`/whatsapp/list/${META_PHONE_ID}/${showHidden}`, body, cookie);
}

async function actionAllChats(p: Record<string, unknown>, cookie: string) {
  const showHidden = Number(p.showHidden ?? 0);
  const pageSize = 50;
  const result: unknown[] = [];
  for (let page = 0; page < 50; page++) {
    const items = (await actionChats({ showHidden, page, pageSize }, cookie)) as unknown[];
    result.push(...items);
    if (items.length < pageSize) break;
  }
  return result;
}

async function actionMessages(p: Record<string, unknown>, cookie: string) {
  const { conversationId, page = 0, pageSize = 50 } = p;
  if (!conversationId) throw new Error("conversationId required");
  const body = new URLSearchParams({
    Page: String(page),
    PageSize: String(pageSize),
    SuperAdmin: "",
  });
  return doobotPOST(`/whatsapp/get/${conversationId}`, body, cookie);
}

async function actionSave(p: Record<string, unknown>, cookie: string) {
  const body = new URLSearchParams({
    ConversationID: String(p.conversationId ?? ""),
    Who: String(p.who ?? "PANEL"),
    Type: String(p.type ?? "text"),
    Body: String(p.body ?? ""),
    ExternalMessageID: String(p.externalMessageId ?? ""),
    SetAutoMode: String(p.setAutoMode ?? false),
    ArchivedFromPanel: String(p.archivedFromPanel ?? 0),
  });
  return doobotPOST("/whatsapp/save", body, cookie);
}

async function actionManagers(cookie: string) {
  return doobotGET("/whatsapp/get-manager-list", cookie);
}

async function actionChange(p: Record<string, unknown>, cookie: string) {
  const { cmd, id, value } = p;
  if (!id) throw new Error("id required");
  const routes: Record<string, string> = {
    mode: `/whatsapp/change-mode/${id}/${value ?? ""}`,
    status: `/whatsapp/change-status/${id}/${value ?? ""}`,
    hide: `/whatsapp/hide/${id}`,
    visible: `/whatsapp/visible/${id}`,
    read: `/whatsapp/read/${id}`,
    campaign: `/whatsapp/change-campaign/${id}/${encodeURIComponent(String(value ?? ""))}`,
    manager: `/whatsapp/change-manager/${id}/`,
    bot: `/whatsapp/change-bot/${id}/${encodeURIComponent(String(value ?? ""))}`,
    timezone: `/whatsapp/change-time-zone/${id}/${encodeURIComponent(String(value ?? ""))}`,
    contact: `/whatsapp/change-contact/${id}/${encodeURIComponent(String(value ?? ""))}`,
    alias: `/whatsapp/change-name/${id}/${encodeURIComponent(String(value ?? ""))}`,
  };
  const path = routes[String(cmd)];
  if (!path) throw new Error(`Unknown change cmd: ${cmd}`);
  return doobotGET(path, cookie);
}

// ── Meta Graph API ────────────────────────────────────────────────────
async function actionMetaSend(p: Record<string, unknown>) {
  const { payload } = p;
  if (!payload) throw new Error("payload required for meta:send");
  const res = await fetch(
    `https://graph.facebook.com/v24.0/${META_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${META_TOKEN}`,
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta send failed: ${res.status} — ${err}`);
  }
  return res.json();
}

// ── Servidor principal ────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Verificar JWT del CRM
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await supabaseAuth.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // 2. Parsear body
    const body = await req.json();
    const { action, ...params } = body as { action: string; [k: string]: unknown };
    if (!action) throw new Error("action is required");

    // 3. Obtener sesión Doobot solo para acciones que la necesiten
    let cookie = "";
    if (action.startsWith("doobot:")) {
      cookie = await getDoobotCookie();
    }

    // 4. Dispatch
    let data: unknown;
    switch (action) {
      case "doobot:chats":
        data = await actionChats(params, cookie);
        break;
      case "doobot:all-chats":
        data = await actionAllChats(params, cookie);
        break;
      case "doobot:messages":
        data = await actionMessages(params, cookie);
        break;
      case "doobot:save":
        data = await actionSave(params, cookie);
        break;
      case "doobot:managers":
        data = await actionManagers(cookie);
        break;
      case "doobot:change":
        data = await actionChange(params, cookie);
        break;
      case "meta:send":
        data = await actionMetaSend(params);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : 400;
    console.error("console-api error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
