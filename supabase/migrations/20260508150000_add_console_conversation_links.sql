-- ============================================================
-- Migration: console_conversation_links
-- Propósito: Vincula una conversación externa (doobot/WhatsApp)
--            con un contacto del CRM.
-- ============================================================

-- Tabla principal
CREATE TABLE public.console_conversation_links (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID de la conversación en el sistema externo (doobot ConversationID)
  external_id       text        NOT NULL,

  -- Contacto del CRM vinculado (nullable)
  contact_id        uuid        REFERENCES public.contacts(id) ON DELETE SET NULL,

  -- Canal de la conversación
  channel           text        NOT NULL DEFAULT 'whatsapp',

  -- Teléfono del contacto externo, normalizado
  external_phone    text,

  -- Nombre/alias del contacto externo
  external_name     text,

  -- Campo para futura arquitectura multi-tenant
  organization_id   uuid,

  -- Usuario que creó el link
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CONSTRAINT DE UNICIDAD
-- ============================================================
-- Garantiza unicidad e implícitamente crea el índice sobre external_id.
ALTER TABLE public.console_conversation_links
  ADD CONSTRAINT uq_ccl_external_id UNIQUE (external_id);

-- ============================================================
-- ÍNDICES ADICIONALES
-- ============================================================
CREATE INDEX idx_ccl_contact_id      ON public.console_conversation_links (contact_id);
CREATE INDEX idx_ccl_external_phone  ON public.console_conversation_links (external_phone)
  WHERE external_phone IS NOT NULL;
CREATE INDEX idx_ccl_organization_id ON public.console_conversation_links (organization_id)
  WHERE organization_id IS NOT NULL;
CREATE INDEX idx_ccl_channel         ON public.console_conversation_links (channel);

-- ============================================================
-- TRIGGER updated_at
-- ============================================================
CREATE TRIGGER update_ccl_updated_at
  BEFORE UPDATE ON public.console_conversation_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.console_conversation_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read console_conversation_links"
  ON public.console_conversation_links
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff insert console_conversation_links"
  ON public.console_conversation_links
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_any_role(
      auth.uid(),
      ARRAY['gerencia','administracion','recepcion','comercial']::public.app_role[]
    )
  );

CREATE POLICY "Staff update console_conversation_links"
  ON public.console_conversation_links
  FOR UPDATE TO authenticated
  USING (
    public.has_any_role(
      auth.uid(),
      ARRAY['gerencia','administracion','recepcion','comercial']::public.app_role[]
    )
  )
  WITH CHECK (
    public.has_any_role(
      auth.uid(),
      ARRAY['gerencia','administracion','recepcion','comercial']::public.app_role[]
    )
  );

CREATE POLICY "Admin delete console_conversation_links"
  ON public.console_conversation_links
  FOR DELETE TO authenticated
  USING (
    public.has_any_role(
      auth.uid(),
      ARRAY['gerencia','administracion']::public.app_role[]
    )
  );

-- ============================================================
-- ÍNDICE EN contacts(phone)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contacts_phone
  ON public.contacts (phone)
  WHERE phone IS NOT NULL AND deleted_at IS NULL;
