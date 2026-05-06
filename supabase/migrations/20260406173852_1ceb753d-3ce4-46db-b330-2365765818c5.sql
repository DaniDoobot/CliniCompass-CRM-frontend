
-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE public.business_line AS ENUM ('fisioterapia', 'nutricion', 'psicotecnicos');
CREATE TYPE public.app_role AS ENUM ('gerencia', 'administracion', 'recepcion', 'comercial', 'fisioterapeuta', 'nutricionista', 'psicotecnico');
CREATE TYPE public.lead_status AS ENUM ('nuevo', 'contactado', 'cualificado', 'propuesta', 'ganado', 'perdido');
CREATE TYPE public.patient_status AS ENUM ('activo', 'inactivo', 'alta_pendiente', 'baja');
CREATE TYPE public.appointment_status AS ENUM ('pendiente', 'confirmada', 'realizada', 'cancelada', 'no_presentado', 'reprogramada');
CREATE TYPE public.document_status AS ENUM ('pendiente', 'no_subido', 'subido', 'validado');
CREATE TYPE public.pack_status AS ENUM ('activo', 'completado', 'vencido', 'cancelado');
CREATE TYPE public.interaction_type AS ENUM ('llamada', 'email', 'whatsapp', 'nota', 'accion_comercial');

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- CENTERS
-- =============================================
CREATE TABLE public.centers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_centers_active ON public.centers (active) WHERE deleted_at IS NULL;
CREATE TRIGGER update_centers_updated_at BEFORE UPDATE ON public.centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- USER ROLES
-- =============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
CREATE INDEX idx_user_roles_user ON public.user_roles (user_id);

-- =============================================
-- HAS_ROLE SECURITY DEFINER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: check if user has ANY of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- =============================================
-- STAFF PROFILES
-- =============================================
CREATE TABLE public.staff_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  center_id UUID REFERENCES public.centers(id),
  specialty public.business_line,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_center ON public.staff_profiles (center_id);
CREATE INDEX idx_staff_user ON public.staff_profiles (user_id);
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SERVICES
-- =============================================
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  business_line public.business_line NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_services_line ON public.services (business_line) WHERE active = true;
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PIPELINE STAGES
-- =============================================
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  business_line public.business_line NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pipeline_line ON public.pipeline_stages (business_line, position);

-- =============================================
-- LEADS
-- =============================================
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company_name TEXT,
  business_line public.business_line NOT NULL,
  source TEXT,
  pipeline_stage_id UUID REFERENCES public.pipeline_stages(id),
  status public.lead_status NOT NULL DEFAULT 'nuevo',
  center_id UUID REFERENCES public.centers(id),
  assigned_to UUID REFERENCES public.staff_profiles(id),
  estimated_value NUMERIC(10, 2),
  converted BOOLEAN NOT NULL DEFAULT false,
  converted_to_patient_id UUID,
  notes TEXT,
  next_action TEXT,
  next_action_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_leads_status ON public.leads (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_center ON public.leads (center_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_line ON public.leads (business_line) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned ON public.leads (assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_search ON public.leads (first_name, last_name, email, phone);
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PATIENTS
-- =============================================
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  nif TEXT,
  birth_date DATE,
  sex TEXT CHECK (sex IN ('hombre', 'mujer', 'otro')),
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  center_id UUID REFERENCES public.centers(id),
  assigned_professional_id UUID REFERENCES public.staff_profiles(id),
  source TEXT,
  source_lead_id UUID REFERENCES public.leads(id),
  status public.patient_status NOT NULL DEFAULT 'alta_pendiente',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  -- Billing fields
  fiscal_name TEXT,
  fiscal_nif TEXT,
  fiscal_address TEXT,
  fiscal_email TEXT,
  fiscal_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_patients_status ON public.patients (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_center ON public.patients (center_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_professional ON public.patients (assigned_professional_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_nif ON public.patients (nif) WHERE nif IS NOT NULL;
CREATE INDEX idx_patients_search ON public.patients (first_name, last_name, nif, phone, email);
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK from leads to patients
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_converted_patient FOREIGN KEY (converted_to_patient_id) REFERENCES public.patients(id);

-- =============================================
-- APPOINTMENTS
-- =============================================
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  service_id UUID REFERENCES public.services(id),
  center_id UUID NOT NULL REFERENCES public.centers(id),
  professional_id UUID REFERENCES public.staff_profiles(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pendiente',
  treatment_pack_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_appointments_patient ON public.appointments (patient_id);
CREATE INDEX idx_appointments_center ON public.appointments (center_id);
CREATE INDEX idx_appointments_professional ON public.appointments (professional_id);
CREATE INDEX idx_appointments_time ON public.appointments (start_time, end_time);
CREATE INDEX idx_appointments_status ON public.appointments (status);
CREATE INDEX idx_appointments_date ON public.appointments (start_time) WHERE status IN ('pendiente', 'confirmada');
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- TREATMENT PACKS (Bonos)
-- =============================================
CREATE TABLE public.treatment_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  service_id UUID REFERENCES public.services(id),
  name TEXT NOT NULL,
  total_sessions INTEGER NOT NULL,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  start_date DATE,
  expiry_date DATE,
  status public.pack_status NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_packs_patient ON public.treatment_packs (patient_id);
CREATE INDEX idx_packs_status ON public.treatment_packs (status) WHERE status = 'activo';
CREATE TRIGGER update_packs_updated_at BEFORE UPDATE ON public.treatment_packs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK from appointments to packs
ALTER TABLE public.appointments ADD CONSTRAINT fk_appointments_pack FOREIGN KEY (treatment_pack_id) REFERENCES public.treatment_packs(id);

-- =============================================
-- DOCUMENT TYPES
-- =============================================
CREATE TABLE public.document_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- DOCUMENTS
-- =============================================
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  document_type_id UUID REFERENCES public.document_types(id),
  center_id UUID REFERENCES public.centers(id),
  file_path TEXT,
  file_name TEXT,
  status public.document_status NOT NULL DEFAULT 'pendiente',
  uploaded_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_patient ON public.documents (patient_id);
CREATE INDEX idx_documents_status ON public.documents (status);
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INTERACTIONS
-- =============================================
CREATE TABLE public.interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES public.patients(id),
  lead_id UUID REFERENCES public.leads(id),
  type public.interaction_type NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interactions_patient ON public.interactions (patient_id);
CREATE INDEX idx_interactions_lead ON public.interactions (lead_id);
CREATE INDEX idx_interactions_date ON public.interactions (created_at DESC);

-- =============================================
-- STORAGE BUCKET
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- =============================================
-- RLS: ENABLE ON ALL TABLES
-- =============================================
ALTER TABLE public.centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: READ (all authenticated for internal app)
-- =============================================
CREATE POLICY "Authenticated read centers" ON public.centers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read staff_profiles" ON public.staff_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read services" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read pipeline_stages" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read treatment_packs" ON public.treatment_packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read document_types" ON public.document_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read interactions" ON public.interactions FOR SELECT TO authenticated USING (true);

-- =============================================
-- RLS POLICIES: WRITE (role-based)
-- =============================================

-- Centers: gerencia, administracion
CREATE POLICY "Admin manage centers" ON public.centers FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));
CREATE POLICY "Admin update centers" ON public.centers FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));
CREATE POLICY "Admin delete centers" ON public.centers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerencia'));

-- User roles: gerencia only
CREATE POLICY "Gerencia manage roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'gerencia'));
CREATE POLICY "Gerencia update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'gerencia'));
CREATE POLICY "Gerencia delete roles" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerencia'));

-- Staff profiles: gerencia, administracion
CREATE POLICY "Admin manage staff" ON public.staff_profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));
CREATE POLICY "Admin update staff" ON public.staff_profiles FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[])
    OR auth.uid() = user_id);
CREATE POLICY "Admin delete staff" ON public.staff_profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'gerencia'));

-- Services: gerencia, administracion
CREATE POLICY "Admin manage services" ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));
CREATE POLICY "Admin update services" ON public.services FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));

-- Pipeline stages: gerencia, administracion
CREATE POLICY "Admin manage stages" ON public.pipeline_stages FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));
CREATE POLICY "Admin update stages" ON public.pipeline_stages FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));

-- Leads: recepcion, comercial, gerencia, administracion
CREATE POLICY "Staff manage leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion', 'recepcion', 'comercial']::public.app_role[]));
CREATE POLICY "Staff update leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion', 'recepcion', 'comercial']::public.app_role[]));
CREATE POLICY "Staff delete leads" ON public.leads FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));

-- Patients: recepcion, administracion, gerencia, clinical
CREATE POLICY "Staff manage patients" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion', 'recepcion', 'fisioterapeuta', 'nutricionista', 'psicotecnico']::public.app_role[]));
CREATE POLICY "Staff update patients" ON public.patients FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion', 'recepcion', 'fisioterapeuta', 'nutricionista', 'psicotecnico']::public.app_role[]));
CREATE POLICY "Admin delete patients" ON public.patients FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));

-- Appointments: all authenticated can manage
CREATE POLICY "Staff manage appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete appointments" ON public.appointments FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion', 'recepcion']::public.app_role[]));

-- Treatment packs: administracion, gerencia, clinical
CREATE POLICY "Staff manage packs" ON public.treatment_packs FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion', 'fisioterapeuta', 'nutricionista']::public.app_role[]));
CREATE POLICY "Staff update packs" ON public.treatment_packs FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion', 'fisioterapeuta', 'nutricionista']::public.app_role[]));

-- Document types: gerencia, administracion
CREATE POLICY "Admin manage doc types" ON public.document_types FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));
CREATE POLICY "Admin update doc types" ON public.document_types FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));

-- Documents: all authenticated can manage
CREATE POLICY "Staff manage documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Staff update documents" ON public.documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin delete documents" ON public.documents FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia', 'administracion']::public.app_role[]));

-- Interactions: all authenticated can create
CREATE POLICY "Staff create interactions" ON public.interactions FOR INSERT TO authenticated WITH CHECK (true);

-- Storage policies for documents bucket
CREATE POLICY "Authenticated read documents storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "Authenticated upload documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Authenticated update documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents');

-- =============================================
-- SEED DATA: Pipeline stages
-- =============================================
INSERT INTO public.pipeline_stages (name, business_line, position) VALUES
  ('Nuevo', 'fisioterapia', 1),
  ('Contactado', 'fisioterapia', 2),
  ('Cualificado', 'fisioterapia', 3),
  ('Propuesta enviada', 'fisioterapia', 4),
  ('Ganado', 'fisioterapia', 5),
  ('Perdido', 'fisioterapia', 6),
  ('Nuevo', 'nutricion', 1),
  ('Contactado', 'nutricion', 2),
  ('Cualificado', 'nutricion', 3),
  ('Propuesta enviada', 'nutricion', 4),
  ('Ganado', 'nutricion', 5),
  ('Perdido', 'nutricion', 6),
  ('Nuevo', 'psicotecnicos', 1),
  ('Contactado', 'psicotecnicos', 2),
  ('Cualificado', 'psicotecnicos', 3),
  ('Propuesta enviada', 'psicotecnicos', 4),
  ('Ganado', 'psicotecnicos', 5),
  ('Perdido', 'psicotecnicos', 6);

-- =============================================
-- SEED DATA: Document types
-- =============================================
INSERT INTO public.document_types (name, category) VALUES
  ('Consentimiento RGPD', 'legal'),
  ('Consentimiento informado', 'clinico'),
  ('Informe clínico', 'clinico'),
  ('Informe de alta', 'clinico'),
  ('Certificado psicotécnico', 'certificado'),
  ('Informe nutricional', 'clinico'),
  ('Documentación administrativa', 'administrativo'),
  ('Factura', 'facturacion'),
  ('Informe traumatología', 'clinico'),
  ('Otros', 'general');

-- =============================================
-- TRIGGER: Auto-create staff profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
