-- =============================================
-- patient_synopsis
-- Sinopsis clínica global generada por IA.
-- Una fila por paciente/contacto (UNIQUE parciales).
-- Escrita por Edge Functions con service_role.
-- =============================================
CREATE TABLE public.patient_synopsis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_synopsis_owner_check CHECK (
    (patient_id IS NOT NULL AND contact_id IS NULL) OR
    (patient_id IS NULL  AND contact_id IS NOT NULL)
  )
);

-- Un único synopsis por paciente/contacto
CREATE UNIQUE INDEX idx_patient_synopsis_patient ON public.patient_synopsis(patient_id) WHERE patient_id IS NOT NULL;
CREATE UNIQUE INDEX idx_patient_synopsis_contact ON public.patient_synopsis(contact_id) WHERE contact_id IS NOT NULL;

CREATE TRIGGER trg_patient_synopsis_updated_at
BEFORE UPDATE ON public.patient_synopsis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.patient_synopsis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_synopsis"
  ON public.patient_synopsis FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff manage patient_synopsis"
  ON public.patient_synopsis FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE POLICY "Staff update patient_synopsis"
  ON public.patient_synopsis FOR UPDATE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE POLICY "Admin delete patient_synopsis"
  ON public.patient_synopsis FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));


-- =============================================
-- patient_voice_edits
-- Log de trazabilidad de ediciones por voz.
-- Escrita por process-voice-edit, process-voice-unified,
-- create-contact-voice. Leída por useVoiceEdit en el frontend.
-- =============================================
CREATE TABLE public.patient_voice_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  transcription text,
  interpreted_instruction text,
  fields_changed jsonb,
  audio_file_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_voice_edits_owner_check CHECK (
    patient_id IS NOT NULL OR contact_id IS NOT NULL
  )
);

-- Índices para las queries del frontend (ORDER BY created_at DESC, LIMIT 20)
CREATE INDEX idx_patient_voice_edits_patient ON public.patient_voice_edits(patient_id, created_at DESC) WHERE patient_id IS NOT NULL;
CREATE INDEX idx_patient_voice_edits_contact ON public.patient_voice_edits(contact_id, created_at DESC) WHERE contact_id IS NOT NULL;

ALTER TABLE public.patient_voice_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read patient_voice_edits"
  ON public.patient_voice_edits FOR SELECT TO authenticated USING (true);

-- Las Edge Functions usan service_role (bypass RLS), pero añadimos
-- policy de INSERT para peticiones directas desde cliente autenticado.
CREATE POLICY "Staff create patient_voice_edits"
  ON public.patient_voice_edits FOR INSERT TO authenticated
  WITH CHECK (has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','fisioterapeuta','nutricionista','psicotecnico']::app_role[]));

CREATE POLICY "Admin delete patient_voice_edits"
  ON public.patient_voice_edits FOR DELETE TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));
