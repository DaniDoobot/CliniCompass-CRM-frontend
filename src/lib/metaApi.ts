/**
 * Cliente para Meta Graph API (WhatsApp Cloud API).
 *
 * `sendToMeta` delega en la Edge Function `console-api` (action: "meta:send").
 * El META_TOKEN y META_PHONE_ID residen server-side.
 *
 * Los builders de payload (sendTextMessage, sendImageMessage, etc.)
 * construyen el body y lo envían a través de la EF.
 */

import { supabase } from "@/integrations/supabase/client";
import type { TemplateDefinition } from "./doobotConfig";
import { getTranslation } from "./doobotConfig";

export interface MetaSendResponse {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

// ── Envío a través de la EF ────────────────────────────────────────────
async function sendToMeta(payload: object): Promise<MetaSendResponse> {
  const { data, error } = await supabase.functions.invoke("console-api", {
    body: { action: "meta:send", payload },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.data as MetaSendResponse;
}

// ── Builders ───────────────────────────────────────────────────────────
// Nota: el campo `to` es el teléfono del destinatario (cliente), no el phone ID de negocio.

export async function sendTextMessage(to: string, text: string): Promise<MetaSendResponse> {
  return sendToMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  });
}

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption: string
): Promise<MetaSendResponse> {
  const image: Record<string, string> = { link: imageUrl };
  if (caption) image.caption = caption;
  return sendToMeta({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "image", image });
}

export async function sendVideoMessage(
  to: string,
  videoUrl: string,
  caption: string
): Promise<MetaSendResponse> {
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

  const metaPayload = {
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

  const metaResponse = await sendToMeta(metaPayload);

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
