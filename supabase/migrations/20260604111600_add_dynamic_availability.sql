-- Create staff_schedules table
CREATE TABLE public.staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

CREATE INDEX idx_staff_schedules_staff ON public.staff_schedules(staff_profile_id);
CREATE INDEX idx_staff_schedules_center ON public.staff_schedules(center_id);

ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read staff_schedules" 
    ON public.staff_schedules FOR SELECT 
    TO authenticated USING (true);

CREATE POLICY "Admin manage staff_schedules" 
    ON public.staff_schedules FOR ALL 
    TO authenticated 
    USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Create staff_time_off table
CREATE TABLE public.staff_time_off (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    center_id UUID REFERENCES public.centers(id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('vacaciones', 'baja', 'festivo', 'bloqueo_manual', 'otro')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT valid_date_range CHECK (start_date < end_date)
);

CREATE INDEX idx_staff_time_off_staff ON public.staff_time_off(staff_profile_id);
CREATE INDEX idx_staff_time_off_dates ON public.staff_time_off(start_date, end_date);

ALTER TABLE public.staff_time_off ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read staff_time_off" 
    ON public.staff_time_off FOR SELECT 
    TO authenticated USING (true);

CREATE POLICY "Admin manage staff_time_off" 
    ON public.staff_time_off FOR ALL 
    TO authenticated 
    USING (has_any_role(auth.uid(), ARRAY['gerencia','administracion']::app_role[]));

-- Triggers for updated_at
CREATE TRIGGER update_staff_schedules_updated_at 
    BEFORE UPDATE ON public.staff_schedules 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_time_off_updated_at 
    BEFORE UPDATE ON public.staff_time_off 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
