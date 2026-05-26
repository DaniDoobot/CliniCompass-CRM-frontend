/**
 * Hook para cargar mensajes de una conversación y enviar mensajes.
 * Flujo de envío de 2 pasos: Meta Graph API → guardar en doobot.
 *
 * ⚠️  El token de Meta se envía desde el frontend en desarrollo.
 *     En producción mover sendToMeta a Edge Function (Fase 4).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchMessages, saveMessage, type MessageItem } from "@/lib/doobotApi";
import {
  sendTextMessage,
  sendImageMessage,
  sendVideoMessage,
  sendDocumentMessage,
  sendButtonsMessage,
  sendTemplateMessage as metaSendTemplate,
  buildSaveBody,
} from "@/lib/metaApi";
import type { TemplateDefinition } from "@/lib/doobotConfig";
import { findTemplateByName, getTranslation } from "@/lib/doobotConfig";

// =========================================================
// TIPOS PARSEADOS PARA LA UI
// =========================================================
export interface ParsedMessage {
  id: string;
  text: string;
  fromUser: boolean; // true = PANEL/BOT (derecha), false = CLIENT (izquierda)
  time: string;
  buttons?: { id: string; text: string }[];
  isDocument: boolean;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  status?: string;
  who?: string;
}

// =========================================================
// PARSING DE MENSAJES
// =========================================================
function parseTimestamp(msg: MessageItem): number {
  if (msg.SentTimestamp) {
    const n = parseInt(msg.SentTimestamp, 10);
    if (!isNaN(n)) return n < 100_000_000_000 ? n * 1000 : n;
  }
  if (msg.CreationDate) {
    const d = new Date(msg.CreationDate.trim().replace(/^(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1"));
    if (!isNaN(d.getTime())) return d.getTime();
  }
  return 0;
}

function safeJsonParse(raw: string): any | null {
  try { return JSON.parse(raw); } catch { return null; }
}

function effectiveType(msg: MessageItem, json: any): string {
  if (json && (json.template || (json.name && json.components))) {
    return "template";
  }
  return ((json?.type || msg.Type || "")).toLowerCase();
}

function extractText(msg: MessageItem): string {
  const raw = msg.Body ?? "";
  const json = safeJsonParse(raw);
  if (!json) return raw;
  const type = effectiveType(msg, json);
  switch (type) {
    case "text": return json.text?.body ?? raw;
    case "image": return json.image?.caption ?? "";
    case "video": return json.video?.caption ?? "";
    case "audio": return json.transcription ?? json.text ?? json.audio?.transcription ?? "";
    case "button": return json.button?.text ?? json.button?.payload ?? raw;
    case "document": {
      const label = (json.document?.caption ?? "") || (json.document?.filename ?? "");
      return label ? `Documento: ${label}` : "Documento";
    }
    case "interactive": {
      const inter = json.interactive;
      if (!inter) return raw;
      const itype = (inter.type || "").toLowerCase();
      if (itype === "button" || itype === "list") return inter.body?.text ?? raw;
      if (itype === "button_reply") return inter.button_reply?.title ?? raw;
      if (itype === "list_reply") return inter.list_reply?.title ?? raw;
      return raw;
    }
    case "template": {
      const tpl = json.template || json;
      if (!tpl || !tpl.name) return raw;
      const langCode = typeof tpl.language === "string" 
        ? tpl.language 
        : (tpl.language?.code ?? "es");
      const tplDef = findTemplateByName(tpl.name);
      
      const comps = tpl.components || [];
      for (const comp of comps) {
        if ((comp.type || "").toUpperCase() === "BODY") {
          let text = comp.text ?? "";
          if (!text && tplDef) {
            text = getTranslation(tplDef, langCode).bodyText;
          }
          if (!text) return raw;
          
          const params = comp.parameters || [];
          if (Array.isArray(params)) {
            params.forEach((p: any, i: number) => {
              text = text.replace(`{{${i + 1}}}`, p.text ?? "");
            });
          }
          return text;
        }
      }
      
      // Fallback: If we couldn't find a BODY component but we have a template definition
      if (tplDef) {
        let text = getTranslation(tplDef, langCode).bodyText;
        // Search body parameters in the payload components to replace placeholders
        for (const comp of comps) {
          if ((comp.type || "").toUpperCase() === "BODY") {
            const params = comp.parameters || [];
            if (Array.isArray(params)) {
              params.forEach((p: any, i: number) => {
                text = text.replace(`{{${i + 1}}}`, p.text ?? "");
              });
            }
          }
        }
        return text;
      }
      return raw;
    }
    default: return raw;
  }
}

function extractButtons(msg: MessageItem): { id: string; text: string }[] | undefined {
  const json = safeJsonParse(msg.Body ?? "");
  if (!json) return undefined;
  const type = effectiveType(msg, json);
  if (type === "interactive" && json.interactive?.type === "button") {
    const buttons = json.interactive?.action?.buttons;
    if (Array.isArray(buttons)) return buttons.map((b: any) => ({ id: b.reply?.id ?? "", text: b.reply?.title ?? "" }));
  }
  const tpl = json.template || json;
  if (type === "template" && tpl?.components) {
    for (const comp of tpl.components) {
      if ((comp.type || "").toUpperCase() === "BUTTONS" && Array.isArray(comp.buttons)) {
        return comp.buttons.map((b: any) => ({ id: b.type ?? "", text: b.text ?? "" }));
      }
    }
  }
  return undefined;
}

function extractImageUrl(msg: MessageItem): string | undefined {
  const json = safeJsonParse(msg.Body ?? "");
  if (!json || effectiveType(msg, json) !== "image") return undefined;
  return json.image?.link || undefined;
}

function extractVideoUrl(msg: MessageItem): string | undefined {
  const json = safeJsonParse(msg.Body ?? "");
  if (!json || effectiveType(msg, json) !== "video") return undefined;
  return json.video?.link || undefined;
}

function extractAudioUrl(msg: MessageItem): string | undefined {
  const json = safeJsonParse(msg.Body ?? "");
  if (!json || effectiveType(msg, json) !== "audio") return undefined;
  return json.audio?.link || json.audio?.url || undefined;
}

function extractAudioId(msg: MessageItem): string | undefined {
  const json = safeJsonParse(msg.Body ?? "");
  if (!json || effectiveType(msg, json) !== "audio") return undefined;
  return json.audio?.id || undefined;
}

function isDocumentMessage(msg: MessageItem): boolean {
  const json = safeJsonParse(msg.Body ?? "");
  if (!json) return msg.Type?.toLowerCase() === "document";
  return effectiveType(msg, json) === "document";
}

function parseMessages(items: MessageItem[]): ParsedMessage[] {
  return items
    .slice()
    .sort((a, b) => {
      const diff = parseTimestamp(a) - parseTimestamp(b);
      if (diff !== 0) return diff;
      return (parseInt(a.MessageID ?? "0") || 0) - (parseInt(b.MessageID ?? "0") || 0);
    })
    .map((msg) => ({
      id: msg.MessageID ?? crypto.randomUUID(),
      text: extractText(msg),
      fromUser: (msg.Who?.toUpperCase() ?? "") !== "CLIENT",
      time: msg.CreationDate ?? "",
      buttons: extractButtons(msg),
      isDocument: isDocumentMessage(msg),
      imageUrl: extractImageUrl(msg),
      videoUrl: extractVideoUrl(msg),
      audioUrl: extractAudioUrl(msg),
      audioId: extractAudioId(msg),
      status: msg.Status ?? undefined,
      who: msg.Who ?? undefined,
    }));
}

// =========================================================
// HOOK
// =========================================================
export function useDoobotMessages(conversationId: string | null) {
  const qc = useQueryClient();
  const key = ["doobot-messages", conversationId];

  const query = useQuery<ParsedMessage[]>({
    queryKey: key,
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await fetchMessages(conversationId);
      return parseMessages(res.messages ?? []);
    },
    enabled: !!conversationId,
    refetchInterval: 8_000,
    staleTime: 4_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  const sendText = useMutation({
    mutationFn: async ({ phone, text }: { phone: string; text: string }) => {
      const meta = await sendTextMessage(phone, text);
      const wamid = meta.messages?.[0]?.id ?? "";
      const body = buildSaveBody(phone, "text", { text: { preview_url: false, body: text } });
      await saveMessage({ conversationId: conversationId!, type: "text", body, externalMessageId: wamid });
    },
    onSuccess: invalidate,
  });

  const sendImage = useMutation({
    mutationFn: async ({ phone, url, caption }: { phone: string; url: string; caption: string }) => {
      const meta = await sendImageMessage(phone, url, caption);
      const wamid = meta.messages?.[0]?.id ?? "";
      const content: Record<string, any> = { image: { link: url } };
      if (caption) content.image.caption = caption;
      const body = buildSaveBody(phone, "image", content);
      await saveMessage({ conversationId: conversationId!, type: "image", body, externalMessageId: wamid });
    },
    onSuccess: invalidate,
  });

  const sendVideo = useMutation({
    mutationFn: async ({ phone, url, caption }: { phone: string; url: string; caption: string }) => {
      const meta = await sendVideoMessage(phone, url, caption);
      const wamid = meta.messages?.[0]?.id ?? "";
      const content: Record<string, any> = { video: { link: url } };
      if (caption) content.video.caption = caption;
      const body = buildSaveBody(phone, "video", content);
      await saveMessage({ conversationId: conversationId!, type: "video", body, externalMessageId: wamid });
    },
    onSuccess: invalidate,
  });

  const sendDocument = useMutation({
    mutationFn: async ({ phone, url, caption, filename }: { phone: string; url: string; caption: string; filename: string }) => {
      const meta = await sendDocumentMessage(phone, url, caption, filename);
      const wamid = meta.messages?.[0]?.id ?? "";
      const content: Record<string, any> = { document: { link: url } };
      if (caption) content.document.caption = caption;
      if (filename) content.document.filename = filename;
      const body = buildSaveBody(phone, "document", content);
      await saveMessage({ conversationId: conversationId!, type: "document", body, externalMessageId: wamid });
    },
    onSuccess: invalidate,
  });

  const sendButtons = useMutation({
    mutationFn: async ({ phone, bodyText, buttons }: { phone: string; bodyText: string; buttons: { id: string; text: string }[] }) => {
      const meta = await sendButtonsMessage(phone, bodyText, buttons);
      const wamid = meta.messages?.[0]?.id ?? "";
      const content = {
        interactive: {
          type: "button",
          body: { text: bodyText },
          action: { buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.text } })) },
        },
      };
      const body = buildSaveBody(phone, "interactive", content);
      await saveMessage({ conversationId: conversationId!, type: "interactive", body, externalMessageId: wamid });
    },
    onSuccess: invalidate,
  });

  const sendTemplate = useMutation({
    mutationFn: async ({
      phone, template, languageCode, variables,
    }: { phone: string; template: TemplateDefinition; languageCode: string; variables: string[] }) => {
      const { metaResponse, saveBody } = await metaSendTemplate(phone, template, languageCode, variables);
      const wamid = metaResponse.messages?.[0]?.id ?? "";
      await saveMessage({ conversationId: conversationId!, type: "template", body: saveBody, externalMessageId: wamid });
    },
    onSuccess: invalidate,
  });

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    sendText,
    sendImage,
    sendVideo,
    sendDocument,
    sendButtons,
    sendTemplate,
  };
}
