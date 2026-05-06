
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Staff manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff manage documents" ON public.documents;
DROP POLICY IF EXISTS "Staff update documents" ON public.documents;
DROP POLICY IF EXISTS "Staff create interactions" ON public.interactions;

-- Appointments: any staff role
CREATE POLICY "Staff manage appointments" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial','fisioterapeuta','nutricionista','psicotecnico']::public.app_role[]));
CREATE POLICY "Staff update appointments" ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial','fisioterapeuta','nutricionista','psicotecnico']::public.app_role[]));

-- Documents: any staff role
CREATE POLICY "Staff manage documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial','fisioterapeuta','nutricionista','psicotecnico']::public.app_role[]));
CREATE POLICY "Staff update documents" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial','fisioterapeuta','nutricionista','psicotecnico']::public.app_role[]));

-- Interactions: any staff role
CREATE POLICY "Staff create interactions" ON public.interactions FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['gerencia','administracion','recepcion','comercial','fisioterapeuta','nutricionista','psicotecnico']::public.app_role[]));
