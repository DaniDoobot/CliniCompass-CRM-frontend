/**
 * DoobotConsole — Catálogos y configuración de UI.
 *
 * Las credenciales (DOOBOT_USER, DOOBOT_PASS, META_TOKEN, META_PHONE_ID,
 * DOOBOT_CONSOLE_ID) residen exclusivamente en la Edge Function `console-api`
 * como variables de entorno server-side. No se exponen al bundle del navegador.
 *
 * Este archivo solo contiene catálogos de UI y definiciones de plantillas.
 */

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
