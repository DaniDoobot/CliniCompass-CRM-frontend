-- Migration: Add WhatsApp sends module tables

-- Batch table (groups bulk/scheduled sends)
CREATE TABLE IF NOT EXISTS public.whatsapp_send_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_type TEXT NOT NULL CHECK (batch_type IN ('bulk', 'scheduled')),
  name TEXT NOT NULL DEFAULT '',
  bot_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  template_name TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT,
  total_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'paused', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_send_batches ENABLE ROW LEVEL SECURITY;

-- Individual send records
CREATE TABLE IF NOT EXISTS public.whatsapp_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  send_type TEXT NOT NULL CHECK (send_type IN ('manual', 'bulk', 'scheduled')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  phone TEXT NOT NULL,
  client_name TEXT,
  bot_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  template_name TEXT,
  template_vars JSONB DEFAULT '[]'::jsonb,
  batch_id UUID REFERENCES public.whatsapp_send_batches(id) ON DELETE CASCADE,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_send_batches
CREATE POLICY "Users can view own company batches" ON public.whatsapp_send_batches
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert own company batches" ON public.whatsapp_send_batches
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update own company batches" ON public.whatsapp_send_batches
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can delete own company batches" ON public.whatsapp_send_batches
  FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for whatsapp_sends
CREATE POLICY "Users can view own company sends" ON public.whatsapp_sends
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can insert own company sends" ON public.whatsapp_sends
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can update own company sends" ON public.whatsapp_sends
  FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

-- Indexes for performance
CREATE INDEX idx_whatsapp_sends_batch ON public.whatsapp_sends(batch_id);
CREATE INDEX idx_whatsapp_sends_company ON public.whatsapp_sends(company_id, created_at DESC);
CREATE INDEX idx_whatsapp_send_batches_company ON public.whatsapp_send_batches(company_id, created_at DESC);
CREATE INDEX idx_whatsapp_send_batches_scheduled ON public.whatsapp_send_batches(scheduled_at)
  WHERE batch_type = 'scheduled' AND is_active = true AND status = 'draft';
