/**
 * normalizePhone — utilidad reutilizable de normalización de número de teléfono.
 *
 * Elimina: +, espacios, guiones, paréntesis, puntos.
 * Ejemplo: "+34 612-345 678" → "34612345678"
 *
 * Uso:
 *   import { normalizePhone, phonesMatch } from "@/lib/normalizePhone";
 */

/**
 * Devuelve el número limpio de caracteres no numéricos.
 * "+34 612-345 678" → "34612345678"
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[\s\+\-\(\)\.]/g, "");
}

/**
 * Compara dos números de teléfono independientemente de formato.
 * Maneja también el caso en que uno tenga prefijo de país y el otro no.
 * Ejemplo: "612345678" y "+34612345678" → true
 */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Comparación sin prefijo de país (últimos 9 dígitos)
  const tail = 9;
  if (na.length >= tail && nb.length >= tail) {
    return na.slice(-tail) === nb.slice(-tail);
  }
  return false;
}
