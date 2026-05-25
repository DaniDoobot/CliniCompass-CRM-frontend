/**
 * DoobotConsole — Configuración global y catálogos.
 *
 * Equivalente web de AppConfig.kt + Catalogs.kt de la app Android.
 * Todos los valores se leen del .env (VITE_DOOBOT_*) para no
 * hardcodear credenciales en el código fuente.
 */

// =========================================================
// HOSTS (proxied via Vite dev server)
// =========================================================
export const DOOBOT_API_BASE = "/api/doobot";
export const META_API_BASE = "/api/meta";

// =========================================================
// CREDENCIALES
// =========================================================
export const DOOBOT_USER = import.meta.env.VITE_DOOBOT_USER ?? "admin";
export const DOOBOT_PASS = import.meta.env.VITE_DOOBOT_PASS ?? "admin";
export const META_TOKEN = import.meta.env.VITE_DOOBOT_META_TOKEN ?? "";
export const META_PHONE_ID = import.meta.env.VITE_DOOBOT_META_PHONE_ID ?? "835393062993596";
export const CONSOLE_ID = import.meta.env.VITE_DOOBOT_CONSOLE_ID ?? "conversaciones-demo";

// =========================================================
// CATÁLOGOS — id ↔ display
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

export const CampaignCatalog = createCatalog([
  { id: "CAMPAÑA_1", display: "Campaña 1" },
  { id: "CAMPAÑA_2", display: "Campaña 2" },
  { id: "CAMPAÑA_jorge", display: "Campaña prueba" },
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

export const BotCatalog = createCatalog([
  { id: "demogpt1-pgbq", display: "Desarrollo Boston" },
  { id: "doobot-chatbotcitas-wa-naey", display: "Bot Citas" },
  { id: "langchain-ixim", display: "Citas old" },
  { id: "registro-horario-479308", display: "Fichajes" },
]);

export const TemplateTypeCatalog = createCatalog([
  { id: "recordatorio_cita_primera_presencial", display: "Recordatorio 1ª Cita Presencial (3 var)" },
  { id: "recordatorio_cita_vadillo", display: "Recordatorio Vadillo (3 var)" },
  { id: "recordatorio_cita_trafalgar", display: "Recordatorio Trafalgar (3 var)" },
  { id: "recordatorio_cita_lopezdehoyos", display: "Recordatorio López de Hoyos (3 var)" },
  { id: "recordatorio_cita_delicias", display: "Recordatorio Delicias (3 var)" },
  { id: "recordatorio_cita_vallecas", display: "Recordatorio Vallecas (3 var)" },
  { id: "recordatorio_cita_alcorcon", display: "Recordatorio Alcorcón (3 var)" },
  { id: "recordatorio_cita_sanse", display: "Recordatorio Sanse (3 var)" },
  { id: "recordatorio_cita_getafe", display: "Recordatorio Getafe (3 var)" },
  { id: "recordatorio_cita_talavera", display: "Recordatorio Talavera (3 var)" },
  { id: "recodatorio_previo", display: "Recordatorio día antes (3 var)" },
  { id: "recordatorio", display: "Cita pendiente (1 var)" },
  { id: "reabrir", display: "Reabrir conversación (1 var)" },
  { id: "confirmacion_edicion", display: "Conf Edición (1 var)" },
]);

// =========================================================
// PLANTILLAS VERIFICADAS
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
  company?: "boston" | "don_psicotecnico" | "all";
}

export function getTranslation(tpl: TemplateDefinition, code: string): TemplateTranslation {
  return tpl.translations[code] ?? tpl.translations["es"] ?? Object.values(tpl.translations)[0];
}

export const TemplateCatalog: TemplateDefinition[] = [
  {
    displayName: "Recordatorio 1ª Cita Presencial (3 var)",
    name: "recordatorio_cita_primera_presencial",
    variableCount: 3,
    company: "boston",
    translations: {
      es: {
        bodyText:
          "Hola {{1}}, recuerda que *HOY* a las ⏰ *{{2}}* te espera el doctor para tu *consulta,* en esta dirección:\n\n📍*{{3}}*\n\nEs importante la *punctualidad* para poder *ser atendido* por el doctor.",
        exampleValues: ["Carlos", "11:00", "Paseo de la Castellana 101. Local 1. 28046, Madrid"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Vadillo (3 var)",
    name: "recordatorio_cita_vadillo",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Vadillo", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Trafalgar (3 var)",
    name: "recordatorio_cita_trafalgar",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Trafalgar", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio López de Hoyos (3 var)",
    name: "recordatorio_cita_lopezdehoyos",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica López de Hoyos", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Delicias (3 var)",
    name: "recordatorio_cita_delicias",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Delicias", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Vallecas (3 var)",
    name: "recordatorio_cita_vallecas",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Vallecas", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Alcorcón (3 var)",
    name: "recordatorio_cita_alcorcon",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Alcorcón", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Sanse (3 var)",
    name: "recordatorio_cita_sanse",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Sanse", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Getafe (3 var)",
    name: "recordatorio_cita_getafe",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Getafe", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio Talavera (3 var)",
    name: "recordatorio_cita_talavera",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nTe recordamos que mañana tienes una cita en {{2}} a las {{3}}h.\n\nEn caso de no poder asistir, puedes modificar o cancelar tu cita respondiendo a este mensaje.\n\nGracias.",
        exampleValues: ["Juan", "Clínica Talavera", "11:00"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Recordatorio día antes (3 var)",
    name: "recodatorio_previo",
    variableCount: 3,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText:
          "Hola {{1}}\n\nTe recordamos que *mañana tienes una cita en {{2}} a las {{3}}h.* En caso de no poder asistir, puedes modificar o cancelar tu cita a través de este mismo medio.\n\nGracias.",
        exampleValues: ["Juan", "doobot", "18:00"],
        buttons: [{ type: "URL", text: "Ubicación en Google Maps", url: "https://maps.app.goo.gl/h7ZsxHM4fo75H8mT8" }],
      },
    },
  },
  {
    displayName: "Cita pendiente (1 var)",
    name: "recordatorio",
    variableCount: 1,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText:
          'Hola {{1}}. Según nuestros registros, tienes pendiente una cita con nosotros. *Puedes agendar cita a través del botón de este mensaje*',
        exampleValues: ["Jaime"],
        buttons: [
          { type: "QUICK_REPLY", text: "Agendar Cita" },
          { type: "QUICK_REPLY", text: "Darme de baja" },
        ],
      },
    },
  },
  {
    displayName: "Reabrir conversación (1 var)",
    name: "reabrir",
    variableCount: 1,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "Hola {{1}}\n\nUn saludo",
        exampleValues: ["en cuanto tengas un hueco por favor escríbenos"],
        buttons: [],
      },
    },
  },
  {
    displayName: "Conf Edición (1 var)",
    name: "confirmacion_edicion",
    variableCount: 1,
    company: "don_psicotecnico",
    translations: {
      es: {
        bodyText: "La empresa ha editado el siguiente fichaje\n\n{{1}}\n\n*¿Estás conforme?*",
        exampleValues: ["18-12-25 a las 18:30"],
        buttons: [
          { type: "QUICK_REPLY", text: "Sí estoy conforme" },
          { type: "QUICK_REPLY", text: "No estoy conforme" },
        ],
      },
    },
  },
];

export function findTemplateByName(name: string): TemplateDefinition | undefined {
  return TemplateCatalog.find((t) => t.name === name);
}

export function findTemplateByDisplayName(displayName: string): TemplateDefinition | undefined {
  return TemplateCatalog.find((t) => t.displayName === displayName);
}

export function getTemplatesForCompany(companyName?: string): TemplateDefinition[] {
  if (!companyName) return TemplateCatalog;
  const isBoston = companyName.toLowerCase().includes("boston");
  if (isBoston) {
    return TemplateCatalog.filter((t) => t.company === "boston" || t.company === "all");
  } else {
    return TemplateCatalog.filter((t) => t.company === "don_psicotecnico" || t.company === "all");
  }
}
