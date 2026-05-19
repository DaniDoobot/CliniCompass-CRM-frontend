-- Migration: Add multi-tenancy (companies) and granular user permissions

-- 1. Alter app_role enum to add new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'company_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- 2. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Insert default company
INSERT INTO public.companies (id, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'CliniCompass')
ON CONFLICT (id) DO NOTHING;

-- 4. Add company_id to all tenant-specific tables
ALTER TABLE public.centers ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.staff_profiles ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.treatment_packs ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000' REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL, -- 'pacientes', 'agenda', 'doobot_console', 'leads', 'facturacion'
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_write BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_name)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Helper Functions for Policies
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.staff_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_module_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id 
      AND module_name = _module
      AND (
        (_action = 'read' AND can_read = true) OR
        (_action = 'write' AND can_write = true)
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.has_module_access(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Super admin has access to everything
  IF public.has_role(_user_id, 'super_admin') THEN
    RETURN TRUE;
  END IF;

  -- Company admin has access to everything within their company
  IF public.has_role(_user_id, 'company_admin') THEN
    RETURN TRUE;
  END IF;

  -- Check explicit permissions for staff / normal users
  RETURN public.has_module_permission(_user_id, _module, _action);
END;
$$;

-- 7. Drop Old Policies
DROP POLICY IF EXISTS "Authenticated read centers" ON public.centers;
DROP POLICY IF EXISTS "Authenticated read staff_profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Authenticated read services" ON public.services;
DROP POLICY IF EXISTS "Authenticated read leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated read patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated read treatment_packs" ON public.treatment_packs;
DROP POLICY IF EXISTS "Authenticated read documents" ON public.documents;

DROP POLICY IF EXISTS "Admin manage centers" ON public.centers;
DROP POLICY IF EXISTS "Admin update centers" ON public.centers;
DROP POLICY IF EXISTS "Admin delete centers" ON public.centers;

DROP POLICY IF EXISTS "Gerencia manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Gerencia update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Gerencia delete roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admin manage staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admin update staff" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admin delete staff" ON public.staff_profiles;

DROP POLICY IF EXISTS "Admin manage services" ON public.services;
DROP POLICY IF EXISTS "Admin update services" ON public.services;

DROP POLICY IF EXISTS "Staff manage leads" ON public.leads;
DROP POLICY IF EXISTS "Staff update leads" ON public.leads;
DROP POLICY IF EXISTS "Staff delete leads" ON public.leads;

DROP POLICY IF EXISTS "Staff manage patients" ON public.patients;
DROP POLICY IF EXISTS "Staff update patients" ON public.patients;
DROP POLICY IF EXISTS "Admin delete patients" ON public.patients;

DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admin delete appointments" ON public.appointments;

DROP POLICY IF EXISTS "Staff manage packs" ON public.treatment_packs;
DROP POLICY IF EXISTS "Staff update packs" ON public.treatment_packs;

DROP POLICY IF EXISTS "Staff manage documents" ON public.documents;
DROP POLICY IF EXISTS "Staff update documents" ON public.documents;
DROP POLICY IF EXISTS "Admin delete documents" ON public.documents;

-- 8. Apply New Multi-tenant / Permissions Policies

-- COMPANIES
CREATE POLICY "Super admin manage companies" ON public.companies 
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users read their own company" ON public.companies FOR SELECT
  TO authenticated
  USING (id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

-- USER ROLES
CREATE POLICY "Super admin manage roles" ON public.user_roles 
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admin read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles 
      WHERE staff_profiles.user_id = user_roles.user_id 
        AND staff_profiles.company_id = public.get_user_company_id()
    ) OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Company admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'company_admin')
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles 
      WHERE staff_profiles.user_id = user_roles.user_id 
        AND staff_profiles.company_id = public.get_user_company_id()
    )
    AND role != 'super_admin'
  );

-- USER PERMISSIONS
CREATE POLICY "Super admin manage permissions" ON public.user_permissions TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admin manage permissions" ON public.user_permissions FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'company_admin')
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles 
      WHERE staff_profiles.user_id = user_permissions.user_id 
        AND staff_profiles.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Users read own permissions" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- CENTERS
CREATE POLICY "Select centers" ON public.centers FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Manage centers" ON public.centers FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') 
    OR (public.has_role(auth.uid(), 'company_admin') AND company_id = public.get_user_company_id())
  );

-- STAFF PROFILES
CREATE POLICY "Select staff_profiles" ON public.staff_profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Manage staff_profiles" ON public.staff_profiles FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') 
    OR (public.has_role(auth.uid(), 'company_admin') AND company_id = public.get_user_company_id())
    OR auth.uid() = user_id
  );

-- SERVICES
CREATE POLICY "Select services" ON public.services FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Manage services" ON public.services FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin') 
    OR (public.has_role(auth.uid(), 'company_admin') AND company_id = public.get_user_company_id())
  );

-- LEADS
CREATE POLICY "Select leads" ON public.leads FOR SELECT TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'leads', 'read'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Manage leads" ON public.leads FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'leads', 'write'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- PATIENTS
CREATE POLICY "Select patients" ON public.patients FOR SELECT TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'pacientes', 'read'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Manage patients" ON public.patients FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'pacientes', 'write'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- APPOINTMENTS
CREATE POLICY "Select appointments" ON public.appointments FOR SELECT TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'agenda', 'read'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'agenda', 'write'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- TREATMENT PACKS
CREATE POLICY "Select treatment_packs" ON public.treatment_packs FOR SELECT TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'pacientes', 'read'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Manage treatment_packs" ON public.treatment_packs FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'pacientes', 'write'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- DOCUMENTS
CREATE POLICY "Select documents" ON public.documents FOR SELECT TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'pacientes', 'read'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Manage documents" ON public.documents FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND public.has_module_access(auth.uid(), 'pacientes', 'write'))
    OR public.has_role(auth.uid(), 'super_admin')
  );
