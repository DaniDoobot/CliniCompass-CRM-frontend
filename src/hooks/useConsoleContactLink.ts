/**
 * useConsoleContactLink — vinculación conversación doobot ↔ contacto CRM.
 *
 * Lógica:
 *   1. Busca en console_conversation_links por external_id (ConversationID doobot).
 *   2. Si existe link → carga el contacto CRM.
 *   3. Si no existe link → busca contacto por teléfono normalizado en contacts.
 *   4. Si encuentra por teléfono → crea el link automáticamente.
 *   5. Si no encuentra → expone createContact() para crear uno nuevo y vincularlo.
 *
 * No crea contactos duplicados: normaliza el teléfono antes de buscar.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/normalizePhone";
import { useAuth } from "@/hooks/useAuth";

// =========================================================
// CONSTANTES POR DEFECTO — ajustar según entorno
// =========================================================

/**
 * Categoría por defecto para contactos creados desde WhatsApp.
 * Se resuelve buscando la categoría "lead" en contact_categories.
 */
const DEFAULT_CATEGORY_NAME = "lead";

// center_id NO se hardcodea. Se usa null y se puede asignar manualmente.
// Si en el futuro el usuario tiene un center_id en su staff_profile, se puede usar ese.

// =========================================================
// TIPOS
// =========================================================
export interface LinkedContact {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  center: { name: string } | null;
  category: { name: string; label: string } | null;
  professional: { first_name: string; last_name: string } | null;
  notes: string | null;
}

export interface ConversationLink {
  id: string;
  external_id: string;
  contact_id: string | null;
  channel: string;
  external_phone: string | null;
  external_name: string | null;
  organization_id: string | null;
}

// =========================================================
// HOOK PRINCIPAL
// =========================================================
export function useConsoleContactLink(
  externalId: string | null,
  externalPhone: string | null,
  externalName: string | null
) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const normalizedPhone = normalizePhone(externalPhone);

  // ----- 1. Buscar link existente -----
  const linkQuery = useQuery<ConversationLink | null>({
    queryKey: ["console-link", externalId],
    enabled: !!externalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("console_conversation_links")
        .select("*")
        .eq("external_id", externalId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 30_000,
  });

  const linkContactId = linkQuery.data?.contact_id ?? null;

  // ----- 2. Si no hay link, buscar contacto por teléfono -----
  const phoneSearchQuery = useQuery<{ id: string } | null>({
    queryKey: ["console-phone-search", normalizedPhone],
    enabled: !linkContactId && !!normalizedPhone && linkQuery.isSuccess && !linkQuery.data,
    queryFn: async () => {
      if (!normalizedPhone) return null;
      // Busca con múltiples formatos posibles
      const { data, error } = await supabase
        .from("contacts")
        .select("id, phone")
        .is("deleted_at", null)
        .or(
          [
            `phone.eq.${normalizedPhone}`,
            `phone.eq.+${normalizedPhone}`,
            `phone.ilike.%${normalizedPhone.slice(-9)}`,
          ].join(",")
        )
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
    staleTime: 30_000,
  });

  // ----- 3. Cargar contacto completo -----
  const resolvedContactId = linkContactId ?? phoneSearchQuery.data?.id ?? null;

  const contactQuery = useQuery<LinkedContact | null>({
    queryKey: ["console-contact", resolvedContactId],
    enabled: !!resolvedContactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          id,
          first_name,
          last_name,
          phone,
          email,
          notes,
          center:centers(name),
          category:contact_categories(name, label),
          professional:staff_profiles!contacts_assigned_professional_id_fkey(first_name, last_name)
        `)
        .eq("id", resolvedContactId!)
        .single();
      if (error) throw error;
      return data as unknown as LinkedContact;
    },
    staleTime: 30_000,
  });

  // ----- 4. Auto-crear link si encontramos contacto por teléfono y aún no existe link -----
  const autoLinkMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("console_conversation_links")
        .upsert({
          external_id: externalId!,
          contact_id: contactId,
          channel: "whatsapp",
          external_phone: normalizedPhone || null,
          external_name: externalName || null,
          created_by: user?.id ?? null,
          organization_id: null, // preparado para multiempresa
        }, { onConflict: "external_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["console-link", externalId] });
    },
  });

  // Auto-link: si tenemos contacto por teléfono pero no link, crear automáticamente
  const shouldAutoLink =
    !linkQuery.data &&
    !!phoneSearchQuery.data?.id &&
    !autoLinkMutation.isPending &&
    !autoLinkMutation.isSuccess &&
    !!externalId;

  useEffect(() => {
    if (shouldAutoLink && phoneSearchQuery.data?.id) {
      autoLinkMutation.mutate(phoneSearchQuery.data.id);
    }
  }, [shouldAutoLink, phoneSearchQuery.data?.id]); // excluímos autoLinkMutation de deps para evitar loops

  // ----- 5. Crear contacto nuevo y vincularlo -----
  const createContactAndLink = useMutation({
    mutationFn: async (overrides?: Partial<{
      first_name: string;
      last_name: string;
      center_id: string;
    }>) => {
      // Obtener categoría "lead" por defecto
      const { data: cat } = await supabase
        .from("contact_categories")
        .select("id")
        .eq("name", DEFAULT_CATEGORY_NAME)
        .single();

      if (!cat) throw new Error("No se encontró la categoría por defecto 'lead'");

      const contactPayload = {
        first_name: overrides?.first_name ?? (externalName || "Contacto WhatsApp"),
        last_name: overrides?.last_name ?? null,
        phone: normalizedPhone || externalPhone || null,
        category_id: cat.id,
        center_id: overrides?.center_id ?? null, // no hardcodeado
        source: "whatsapp",
      };

      const { data: newContact, error: contactError } = await supabase
        .from("contacts")
        .insert(contactPayload)
        .select("id")
        .single();

      if (contactError) throw contactError;

      // Crear el link
      const { error: linkError } = await supabase
        .from("console_conversation_links")
        .insert({
          external_id: externalId!,
          contact_id: newContact.id,
          channel: "whatsapp",
          external_phone: normalizedPhone || null,
          external_name: externalName || null,
          created_by: user?.id ?? null,
          organization_id: null,
        });

      if (linkError) throw linkError;
      return newContact;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["console-link", externalId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  // ----- 6. Vincular a contacto existente manualmente -----
  const linkToExistingContact = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from("console_conversation_links")
        .upsert({
          external_id: externalId!,
          contact_id: contactId,
          channel: "whatsapp",
          external_phone: normalizedPhone || null,
          external_name: externalName || null,
          created_by: user?.id ?? null,
          organization_id: null,
        }, { onConflict: "external_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["console-link", externalId] });
    },
  });

  return {
    // Estado
    isLoading: linkQuery.isLoading || (linkQuery.isSuccess && !linkQuery.data && phoneSearchQuery.isLoading),
    contact: contactQuery.data ?? null,
    contactId: resolvedContactId,
    hasLink: !!linkQuery.data,
    // Acciones
    createContactAndLink,
    linkToExistingContact,
  };
}
