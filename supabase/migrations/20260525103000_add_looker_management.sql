-- Migration: Add looker management tables and permissions

CREATE TABLE IF NOT EXISTS public.lookers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL, -- Base embed URL, e.g. "https://datastudio.google.com/embed/reporting/b101b282-36b8-4720-ae69-23ade2746611"
  pages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { id: string, name: string }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on lookers
ALTER TABLE public.lookers ENABLE ROW LEVEL SECURITY;

-- Create user_looker_permissions table
CREATE TABLE IF NOT EXISTS public.user_looker_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  looker_id UUID NOT NULL REFERENCES public.lookers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, looker_id)
);

-- Enable RLS on user_looker_permissions
ALTER TABLE public.user_looker_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for lookers
CREATE POLICY "Super admin manage lookers" ON public.lookers 
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admin manage lookers" ON public.lookers FOR ALL TO authenticated
  USING (
    (public.has_role(auth.uid(), 'company_admin') OR public.has_role(auth.uid(), 'gerencia'))
    AND company_id = public.get_user_company_id()
  );

CREATE POLICY "Select lookers" ON public.lookers FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (
      company_id = public.get_user_company_id()
      AND (
        public.has_role(auth.uid(), 'company_admin')
        OR public.has_role(auth.uid(), 'gerencia')
        OR EXISTS (
          SELECT 1 FROM public.user_looker_permissions ulp
          WHERE ulp.user_id = auth.uid() AND ulp.looker_id = lookers.id
        )
      )
    )
  );

-- Policies for user_looker_permissions
CREATE POLICY "Super admin manage looker permissions" ON public.user_looker_permissions TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Company admin manage looker permissions" ON public.user_looker_permissions FOR ALL TO authenticated
  USING (
    (public.has_role(auth.uid(), 'company_admin') OR public.has_role(auth.uid(), 'gerencia'))
    AND EXISTS (
      SELECT 1 FROM public.staff_profiles 
      WHERE staff_profiles.user_id = user_looker_permissions.user_id 
        AND staff_profiles.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Users read own looker permissions" ON public.user_looker_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Insert default looker for CliniCompass company
INSERT INTO public.lookers (id, company_id, name, url, pages)
VALUES (
  'b101b282-36b8-4720-ae69-23ade2746611',
  '00000000-0000-0000-0000-000000000000',
  'Llamadas Doobot',
  'https://datastudio.google.com/embed/reporting/b101b282-36b8-4720-ae69-23ade2746611',
  '[
    {"id": "mxcmF", "name": "Llamadas Realizadas"},
    {"id": "anotherPage", "name": "Desempeño de Agentes"},
    {"id": "thirdPage", "name": "Análisis de Sentimiento"}
  ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
