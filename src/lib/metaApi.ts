/**
 * Cliente HTTP para la Meta Graph API (WhatsApp Cloud API).
 *
 * ⚠️  Las llamadas pasan por el proxy de Vite (/api/meta) en desarrollo.
 *     En producción, mover el META_TOKEN a una Edge Function para no exponerlo.
 *     Ver TODO de producción en doobotConfig.ts.
 *
 * ENCAPSULACIÓN: Todas las llamadas a Meta deben pasar por este módulo.
 */

import { META_API_BASE, META_TOKEN, META_PHONE_ID } from "./doobotConfig";
import type { TemplateDefinition } from "./doobotConfig";
import { getTranslation } from "./doobotConfig";

export interface MetaSendResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

const metaHeaders = (): HeadersInit => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${META_TOKEN}`,
});

async function sendToMeta(body: object): Promise<MetaSendResponse> {
  const res = await fetch(`${META_API_BASE}/v24.0/${META_PHONE_ID}/messages`, {
    method: "POST",
    headers: metaHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Meta send failed: ${res.status} — ${err}`);
  }
  return res.json();
}

// =========================================================
// BUILDERS + SEND
// =========================================================

export async function sendTextMessage(to: string, text: string): Promise<MetaSendResponse> {
  return sendToMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  });
}

export async function sendImageMessage(to: string, imageUrl: string, caption: string): Promise<MetaSendResponse> {
  const image: Record<string, string> = { link: imageUrl };
  if (caption) image.caption = caption;
  return sendToMeta({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "image", image });
}

export async function sendVideoMessage(to: string, videoUrl: string, caption: string): Promise<MetaSendResponse> {
  const video: Record<string, string> = { link: videoUrl };
  if (caption) video.caption = caption;
  return sendToMeta({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "video", video });
}

export async function sendDocumentMessage(
  to: string,
  docUrl: string,
  caption: string,
  filename: string
): Promise<MetaSendResponse> {
  const document: Record<string, string> = { link: docUrl };
  if (caption) document.caption = caption;
  if (filename) document.filename = filename;
  return sendToMeta({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "document", document });
}

export async function sendButtonsMessage(
  to: string,
  bodyText: string,
  buttons: { id: string; text: string }[]
): Promise<MetaSendResponse> {
  return sendToMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.text } })),
      },
    },
  });
}

export async function sendTemplateMessage(
  to: string,
  template: TemplateDefinition,
  languageCode: string,
  variables: string[]
): Promise<{ metaResponse: MetaSendResponse; saveBody: string }> {
  const components: object[] = [];
  if (template.variableCount > 0) {
    components.push({
      type: "body",
      parameters: variables.map((v) => ({ type: "text", text: v })),
    });
  }

  const metaBody = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: template.name,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  const metaResponse = await sendToMeta(metaBody);

  const translation = getTranslation(template, languageCode);
  let rendered = translation.bodyText;
  variables.forEach((v, i) => {
    rendered = rendered.replace(`{{${i + 1}}}`, v);
  });

  const saveComponents: object[] = [];
  const bodyComp: Record<string, unknown> = { type: "BODY", text: rendered };
  if (variables.length > 0) {
    bodyComp.parameters = variables.map((v) => ({ type: "text", text: v }));
    bodyComp.example = { body_text: [translation.exampleValues] };
  }
  saveComponents.push(bodyComp);

  if (translation.buttons.length > 0) {
    saveComponents.push({
      type: "BUTTONS",
      buttons: translation.buttons.map((btn) => ({
        type: btn.type,
        text: btn.text,
        ...(btn.url ? { url: btn.url } : {}),
      })),
    });
  }

  const saveBody = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: { name: template.name, language: { code: languageCode }, components: saveComponents },
  });

  return { metaResponse, saveBody };
}

/** Construye el JSON body para guardar un mensaje no-template en doobot. */
export function buildSaveBody(to: string, type: string, content: object): string {
  return JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type,
    ...content,
  });
}
