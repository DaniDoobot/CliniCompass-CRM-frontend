-- Fix company_id defaults and add contacts table isolation

-- 1. Create helper function that returns user's company or default company
CREATE OR REPLACE FUNCTION public.get_user_company_id_or_default()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT company_id FROM public.staff_profiles WHERE user_id = auth.uid()),
    '00000000-0000-0000-0000-000000000000'::UUID
  );
$$;

-- 2. Alter existing company_id columns to use this dynamic default
ALTER TABLE public.centers ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.staff_profiles ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.services ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.leads ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.patients ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.appointments ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.treatment_packs ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.documents ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();
ALTER TABLE public.campaigns ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();

-- 3. Add company_id to contacts table and set its default
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS company_id UUID NOT NULL DEFAULT public.get_user_company_id_or_default() REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.contacts ALTER COLUMN company_id SET DEFAULT public.get_user_company_id_or_default();

-- 4. Enable RLS and setup policies for contacts table
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Select contacts" ON public.contacts;
DROP POLICY IF EXISTS "Manage contacts" ON public.contacts;

CREATE POLICY "Select contacts" ON public.contacts FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id()
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (
    (company_id = public.get_user_company_id() AND (
      public.has_role(auth.uid(), 'company_admin')
      OR public.has_role(auth.uid(), 'gerencia')
      OR public.has_role(auth.uid(), 'administracion')
      OR public.has_module_access(auth.uid(), 'pacientes', 'write')
      OR public.has_module_access(auth.uid(), 'leads', 'write')
    ))
    OR public.has_role(auth.uid(), 'super_admin')
  );
