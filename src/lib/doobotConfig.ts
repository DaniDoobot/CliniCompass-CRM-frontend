/**
 * DoobotConsole — Configuración global y catálogos.
 *
 * ⚠️  VARIABLES DE ENTORNO:
 *   VITE_DOOBOT_USER      — usuario de demo (no usar credenciales reales en frontend)
 *   VITE_DOOBOT_PASS      — contraseña de demo (no usar credenciales reales en frontend)
 *   VITE_DOOBOT_META_TOKEN  — token Meta Graph API (solo demo; en producción mover a EF)
 *   VITE_DOOBOT_META_PHONE_ID — phone ID de WhatsApp Business
 *   VITE_DOOBOT_CONSOLE_ID    — consola ID en doobot
 *
 * ⚠️  CATÁLOGOS:
 *   Los valores de CampaignCatalog, BotCatalog, TemplateCatalog son de demo.
 *   Actualizar con los IDs reales antes de producción.
 *
 * TODO (producción):
 *   - Mover META_TOKEN, DOOBOT_USER, DOOBOT_PASS a variables de servidor.
 *   - Crear Edge Functions proxy para doobot y Meta (ver Fase 4 del plan).
 *   - No exponer estos valores en el bundle del navegador.
 */

// =========================================================
// HOSTS (proxied via Vite dev server — ver vite.config.ts)
// En producción estos paths deben apuntar a Edge Functions / Nginx proxy.
// =========================================================
export const DOOBOT_API_BASE = "/api/doobot";
export const META_API_BASE = "/api/meta";

// =========================================================
// CREDENCIALES — ⚠️ SOLO DEMO/DESARROLLO
// =========================================================
export const DOOBOT_USER = import.meta.env.VITE_DOOBOT_USER ?? "";
export const DOOBOT_PASS = import.meta.env.VITE_DOOBOT_PASS ?? "";
export const META_TOKEN = import.meta.env.VITE_DOOBOT_META_TOKEN ?? "";
export const META_PHONE_ID = import.meta.env.VITE_DOOBOT_META_PHONE_ID ?? "";

/**
 * ID de la consola en doobot (aparece en las peticiones de lista de chats).
 * Cambiarlo por el ID real de la cuenta de producción.
 */
export const CONSOLE_ID = import.meta.env.VITE_DOOBOT_CONSOLE_ID ?? "";

// =========================================================
// CATÁLOGOS — id ↔ display
// ⚠️ Sustituir por los valores reales de la cuenta doobot de producción.
// =========================================================
export interface CatalogEntry {
  id: string;
  display: string;
}

function createCatalog(entries: CatalogEntry[]) {
  return {
    entries,
    allDisplays: entries.map((e) => e.display),
    allIds: entries.map((e) => e.id),
    displayFromId(id: string | null | undefined): string {
      if (!id) return "";
      return entries.find((e) => e.id.toLowerCase() === id.toLowerCase())?.display ?? id;
    },
    idFromDisplay(display: string | null | undefined): string {
      if (!display) return "";
      return entries.find((e) => e.display.toLowerCase() === display.toLowerCase())?.id ?? display;
    },
  };
}

export const StatusCatalog = createCatalog([
  { id: "NO_REVISADO", display: "No revisado" },
  { id: "REVISADO", display: "Revisado" },
  { id: "EN_ESPERA", display: "En espera" },
  { id: "EN_GESTION", display: "En gestión" },
  { id: "FINALIZADO", display: "Finalizado" },
  { id: "PLANTILLA", display: "Plantilla" },
  { id: "AUTOFIN", display: "Auto fin" },
]);

// ⚠️ DEMO — actualizar con IDs reales de la cuenta doobot de producción
export const CampaignCatalog = createCatalog([
  { id: "CAMPAÑA_1", display: "Campaña 1" },
  { id: "CAMPAÑA_2", display: "Campaña 2" },
]);

export const IntentCatalog = createCatalog([
  { id: "Solicitud_Contacto", display: "Solicitud Contacto" },
  { id: "Fallback", display: "Fallback" },
]);

export const ContactCatalog = createCatalog([
  { id: "INTENTO_1", display: "Intento 1" },
  { id: "INTENTO_2", display: "Intento 2" },
  { id: "INTENTO_3", display: "Intento 3" },
  { id: "INTENTO_4", display: "Intento 4" },
]);

export const TimeZoneCatalog = createCatalog([
  { id: "9-11", display: "9-11" },
  { id: "11-14", display: "11-14" },
  { id: "14-17", display: "14-17" },
  { id: "17-20", display: "17-20" },
]);

// ⚠️ DEMO — actualizar con IDs reales de los bots de la cuenta doobot de producción
export const BotCatalog = createCatalog([
  { id: "", display: "Sin bot" },
]);

// =========================================================
// PLANTILLAS VERIFICADAS DE WHATSAPP
// ⚠️ DEMO — sustituir por las plantillas aprobadas de la cuenta Meta Business real.
// =========================================================
export interface TemplateButton {
  type: string; // "URL" | "QUICK_REPLY"
  text: string;
  url?: string;
}

export interface TemplateTranslation {
  bodyText: string;
  exampleValues: string[];
  buttons: TemplateButton[];
}

export interface TemplateDefinition {
  displayName: string;
  name: string;
  variableCount: number;
  translations: Record<string, TemplateTranslation>;
}

export function getTranslation(tpl: TemplateDefinition, code: string): TemplateTranslation {
  return tpl.translations[code] ?? tpl.translations["es"] ?? Object.values(tpl.translations)[0];
}

// ⚠️ DEMO — estas plantillas deben coincidir con las aprobadas en Meta Business Manager real
export const TemplateCatalog: TemplateDefinition[] = [];

export function findTemplateByName(name: string): TemplateDefinition | undefined {
  return TemplateCatalog.find((t) => t.name === name);
}

export function findTemplateByDisplayName(displayName: string): TemplateDefinition | undefined {
  return TemplateCatalog.find((t) => t.displayName === displayName);
}
