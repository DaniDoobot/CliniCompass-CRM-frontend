// console-api — Edge Function proxy para Doobot y Meta Graph API.
//
// AUTENTICACIÓN: JWT de Supabase (CRM). Las credenciales de Doobot/Meta
// residen exclusivamente en variables de entorno server-side.
//
// ARQUITECTURA MULTICANAL (TODO — no implementado en esta fase):
//   La resolución de credenciales debe evolucionar al siguiente modelo:
//
//   1. Obtener usuario del JWT → supabase.auth.getUser()
//   2. Obtener staff_profile vinculado al user_id
//   3. Obtener los canales disponibles para ese usuario
//      (tabla: user_channel_access → canal + permisos)
//   4. Usar el channel_id seleccionado por el usuario (o el canal por defecto)
//   5. Cargar las credenciales del canal desde tabla:
//      channel_configs { id, channel_name, doobot_base_url, doobot_user,
//        doobot_pass, doobot_console_id, meta_phone_id, meta_token, active }
//   6. Llamar a Doobot/Meta con esas credenciales
//
//   Nota: la organización es un agrupador superior, pero NO es el selector
//   de credenciales. Un usuario puede tener acceso a múltiples canales
//   (distintos números WhatsApp, distintas cuentas Doobot) independientemente
//   de su organización. El frontend enviará un `channel_id` opcional en el body.
//
// FASE ACTUAL: credenciales globales en variables de entorno (demo/single-tenant).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-doobot-cookie",
};

// ── Supabase ───────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ── Tipo de configuración de canal ────────────────────────────────────
// TODO (multicanal): este tipo debe coincidir con la tabla `channel_configs`.
// Por ahora lo poblamos desde variables de entorno (single-tenant/demo).
interface ChannelConfig {
  doobotBase: string;
  doobotUser: string;
  doobotPass: string;
  doobotConsoleId: string;
  metaPhoneId: string;
  metaToken: string;
}

/**
 * Resuelve la configuración del canal activo para esta invocación.
 *
 * FASE ACTUAL: devuelve credenciales globales desde variables de entorno.
 *
 * TODO (multicanal): sustituir por:
 *   const staff = await admin.from("staff_profiles")
 *     .select("id")
 *     .eq("user_id", userId)
 *     .single();
 *
 *   const access = await admin.from("user_channel_access")
 *     .select("channel:channel_configs(*)")
 *     .eq("staff_profile_id", staff.id)
 *     .eq("channel_id", channelId ?? "<default>")  // channelId viene del body
 *     .single();
 *
 *   return access.channel;  // { doobotBase, doobotUser, doobotPass, ... }
 *
 * @param _userId  UUID del usuario CRM (ignorado en esta fase)
 * @param _channelId  ID del canal seleccionado (ignorado en esta fase)
 */
async function getChannelConfig(userId: string, _channelId?: string): Promise<ChannelConfig> {
  const baseDefault = Deno.env.get("DOOBOT_BASE_URL") ?? "https://demo.doobot.ai";
  let doobotBase = baseDefault;

  if (supabaseAdmin) {
    try {
      const { data: staff, error: staffErr } = await supabaseAdmin
        .from("staff_profiles")
        .select("company_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (staffErr) {
        console.error("Error fetching staff_profile in getChannelConfig:", staffErr);
      } else if (staff?.company_id) {
        const { data: company, error: compErr } = await supabaseAdmin
          .from("companies")
          .select("name")
          .eq("id", staff.company_id)
          .maybeSingle();

        if (compErr) {
          console.error("Error fetching company in getChannelConfig:", compErr);
        } else if (company?.name) {
          const companyName = company.name;
          if (companyName.toLowerCase().includes("boston")) {
            doobotBase = "https://boston.doobot.ai";
            console.log(`[console-api] User ${userId} belongs to company '${companyName}'. Routing to: ${doobotBase}`);
          }
        }
      }
    } catch (err) {
      console.error("Unexpected error resolving company in getChannelConfig:", err);
    }
  }

  return {
    doobotBase,
    doobotUser:      Deno.env.get("DOOBOT_USER") ?? "",
    doobotPass:      Deno.env.get("DOOBOT_PASS") ?? "",
    doobotConsoleId: Deno.env.get("DOOBOT_CONSOLE_ID") ?? "",
    metaPhoneId:     Deno.env.get("META_PHONE_ID") ?? "",
    metaToken:       Deno.env.get("META_TOKEN") ?? "",
  };
}

// ── Sesión Doobot (login stateless por request) ───────────────────────
// TODO (multicanal): cuando se use resolución por canal, el login usará
// cfg.doobotUser / cfg.doobotPass en lugar de las vars globales.
async function getDoobotCookie(cfg: ChannelConfig): Promise<string> {
  const res = await fetch(`${cfg.doobotBase}/user/login?_format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name: cfg.doobotUser, pass: cfg.doobotPass }),
  });
  // 200 = login OK, 422 = sesión ya activa — ambos pueden devolver cookies
  const raw = res.headers.get("set-cookie") ?? "";
  return raw
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function actionDoobotLogin(email: string, pass: string, cfg: ChannelConfig): Promise<{ cookie: string }> {
  const res = await fetch(`${cfg.doobotBase}/user/login?_format=json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ name: email, pass }),
  });
  if (!res.ok) {
    throw new Error("Credenciales de Doobot incorrectas");
  }
  const raw = res.headers.get("set-cookie") ?? "";
  const cookie = raw
    .split(",")
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
  return { cookie };
}

function doobotHeaders(cfg: ChannelConfig, cookie: string): HeadersInit {
  return {
    Authorization: `Bearer ${cfg.metaToken}`,
    Accept: "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  };
}

// ── Helpers HTTP hacia Doobot ─────────────────────────────────────────
async function doobotGET(path: string, cfg: ChannelConfig, cookie: string): Promise<unknown> {
  const res = await fetch(`${cfg.doobotBase}${path}`, {
    method: "GET",
    headers: doobotHeaders(cfg, cookie),
  });
  if (!res.ok) throw new Error(`Doobot GET ${path} → ${res.status}`);
  return res.json();
}

async function doobotPOST(
  path: string,
  body: URLSearchParams,
  cfg: ChannelConfig,
  cookie: string
): Promise<unknown> {
  const res = await fetch(`${cfg.doobotBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...doobotHeaders(cfg, cookie),
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Doobot POST ${path} → ${res.status}`);
  return res.json();
}

// ── Handlers por acción ───────────────────────────────────────────────

async function actionChats(p: Record<string, unknown>, cfg: ChannelConfig, cookie: string) {
  const showHidden = Number(p.showHidden ?? 0);
  const page = Number(p.page ?? 0);
  const pageSize = Number(p.pageSize ?? 50);
  const body = new URLSearchParams({
    Order: "%5B%5D",
    Page: String(page),
    PageSize: String(pageSize),
    SowOwn: "0",
    ShowAll: "0",
    Console: cfg.doobotConsoleId,
    Manager: "",
    Owner: "",
  });
  return doobotPOST(`/whatsapp/list/${cfg.metaPhoneId}/${showHidden}`, body, cfg, cookie);
}

async function actionAllChats(p: Record<string, unknown>, cfg: ChannelConfig, cookie: string) {
  const showHidden = Number(p.showHidden ?? 0);
  const pageSize = 50;
  const result: unknown[] = [];
  for (let page = 0; page < 50; page++) {
    const items = (await actionChats({ showHidden, page, pageSize }, cfg, cookie)) as unknown[];
    result.push(...items);
    if (items.length < pageSize) break;
  }
  return result;
}

async function actionMessages(p: Record<string, unknown>, cfg: ChannelConfig, cookie: string) {
  const { conversationId, page = 0, pageSize = 50 } = p;
  if (!conversationId) throw new Error("conversationId required");
  const body = new URLSearchParams({
    Page: String(page),
    PageSize: String(pageSize),
    SuperAdmin: "",
  });
  return doobotPOST(`/whatsapp/get/${conversationId}`, body, cfg, cookie);
}

async function actionSave(p: Record<string, unknown>, cfg: ChannelConfig, cookie: string) {
  const body = new URLSearchParams({
    ConversationID: String(p.conversationId ?? ""),
    Who: String(p.who ?? "PANEL"),
    Type: String(p.type ?? "text"),
    Body: String(p.body ?? ""),
    ExternalMessageID: String(p.externalMessageId ?? ""),
    SetAutoMode: String(p.setAutoMode ?? false),
    ArchivedFromPanel: String(p.archivedFromPanel ?? 0),
  });
  return doobotPOST("/whatsapp/save", body, cfg, cookie);
}

async function actionManagers(cfg: ChannelConfig, cookie: string) {
  return doobotGET("/whatsapp/get-manager-list", cfg, cookie);
}

async function actionChange(p: Record<string, unknown>, cfg: ChannelConfig, cookie: string) {
  const { cmd, id, value } = p;
  if (!id) throw new Error("id required");
  const routes: Record<string, string> = {
    mode: `/whatsapp/change-mode/${id}/${value ?? ""}`,
    status: `/whatsapp/change-status/${id}/${value ?? ""}`,
    hide: `/whatsapp/hide/${id}`,
    visible: `/whatsapp/visible/${id}`,
    read: `/whatsapp/read/${id}`,
    unread: `/whatsapp/unread/${id}`,
    campaign: `/whatsapp/change-campaign/${id}/${encodeURIComponent(String(value ?? ""))}`,
    manager: `/whatsapp/change-manager/${id}/`,
    bot: `/whatsapp/change-bot/${id}/${encodeURIComponent(String(value ?? ""))}`,
    timezone: `/whatsapp/change-time-zone/${id}/${encodeURIComponent(String(value ?? ""))}`,
    contact: `/whatsapp/change-contact/${id}/${encodeURIComponent(String(value ?? ""))}`,
    alias: `/whatsapp/change-name/${id}/${encodeURIComponent(String(value ?? ""))}`,
  };
  const path = routes[String(cmd)];
  if (!path) throw new Error(`Unknown change cmd: ${cmd}`);
  return doobotGET(path, cfg, cookie);
}

// ── Meta Graph API ────────────────────────────────────────────────────
// TODO (multicanal): cfg.metaPhoneId y cfg.metaToken vendrán del canal
// seleccionado por el usuario, no de variables de entorno globales.
async function actionMetaSend(p: Record<string, unknown>, cfg: ChannelConfig) {
  const { payload } = p;
  if (!payload) throw new Error("payload required for meta:send");
  const res = await fetch(
    `https://graph.facebook.com/v20.0/${cfg.metaPhoneId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.metaToken}`,
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

async function actionMetaMedia(p: Record<string, unknown>, cfg: ChannelConfig) {
  const { mediaId } = p as { mediaId?: string };
  if (!mediaId) throw new Error("mediaId required for meta:media");

  console.log(`[meta:media] Requesting mediaId: ${mediaId}. Token length: ${cfg.metaToken?.length || 0}`);

  // 1. Obtener la URL del archivo multimedia desde Graph API
  const metaRes = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${cfg.metaToken}` },
  });
  if (!metaRes.ok) {
    const err = await metaRes.text();
    console.error(`[meta:media] Meta Graph API returned error status: ${metaRes.status}, body: ${err}`);
    throw new Error(`Meta media metadata fetch failed: ${metaRes.status} — ${err}`);
  }
  const metaJson = await metaRes.json();
  const mediaUrl = metaJson.url;
  if (!mediaUrl) throw new Error("Meta did not return a media URL");

  // 2. Descargar el archivo binario
  const fileRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${cfg.metaToken}` },
  });
  if (!fileRes.ok) {
    const err = await fileRes.text();
    console.error(`[meta:media] Meta media download failed: ${fileRes.status}, body: ${err}`);
    throw new Error(`Meta media file download failed: ${fileRes.status} — ${err}`);
  }

  const contentType = fileRes.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await fileRes.arrayBuffer();

  // Convertir a base64 usando la API de Deno/JavaScript estándar
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.byteLength; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  return { contentType, base64 };
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
    const { action, channel_id, ...params } = body as {
      action: string;
      channel_id?: string; // TODO (multicanal): usar para resolver credenciales del canal
      [k: string]: unknown;
    };
    if (!action) throw new Error("action is required");

    // 3. Resolver configuración del canal
    // TODO (multicanal): pasar user.id y channel_id a getChannelConfig
    //   para que resuelva credenciales por usuario/canal desde BD.
    const cfg = await getChannelConfig(user.id, channel_id);

    // 4. Obtener sesión Doobot solo para acciones que la necesiten
    let cookie = "";
    if (action.startsWith("doobot:") && action !== "doobot:login") {
      // Intentar obtener la cookie desde la cabecera x-doobot-cookie
      cookie = req.headers.get("x-doobot-cookie") || "";
      if (!cookie) {
        // Fallback a credenciales de entorno globales
        cookie = await getDoobotCookie(cfg);
      }
    }

    // 5. Dispatch
    let data: unknown;
    switch (action) {
      case "doobot:login": {
        const { email, password } = params as { email?: string; password?: string };
        if (!email || !password) throw new Error("email and password are required");
        data = await actionDoobotLogin(email, password, cfg);
        break;
      }
      case "doobot:chats":
        data = await actionChats(params, cfg, cookie);
        break;
      case "doobot:all-chats":
        data = await actionAllChats(params, cfg, cookie);
        break;
      case "doobot:messages":
        data = await actionMessages(params, cfg, cookie);
        break;
      case "doobot:save":
        data = await actionSave(params, cfg, cookie);
        break;
      case "doobot:managers":
        data = await actionManagers(cfg, cookie);
        break;
      case "doobot:change":
        data = await actionChange(params, cfg, cookie);
        break;
      case "meta:send":
        data = await actionMetaSend(params, cfg);
        break;
      case "meta:media":
        data = await actionMetaMedia(params, cfg);
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
