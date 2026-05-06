-- Allow gerencia/admin to delete services
CREATE POLICY "Admin delete services" ON public.services FOR DELETE TO authenticated USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Allow gerencia to soft-delete (update active=false) staff profiles — already has update policy, but add delete for hard delete if needed
CREATE POLICY "Admin delete staff_profiles" ON public.staff_profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'gerencia'::app_role));