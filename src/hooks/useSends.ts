/**
 * useSends — React Query hooks for WhatsApp sends CRUD.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SendRecord {
  id: string;
  company_id: string;
  created_by: string;
  send_type: "manual" | "bulk" | "scheduled";
  status: "pending" | "sending" | "sent" | "failed";
  phone: string;
  client_name: string | null;
  bot_id: string;
  language: string;
  template_name: string | null;
  template_vars: string[];
  batch_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface BatchRecord {
  id: string;
  company_id: string;
  created_by: string;
  batch_type: "bulk" | "scheduled";
  name: string;
  bot_id: string;
  language: string;
  template_name: string;
  file_name: string | null;
  total_count: number;
  sent_count: number;
  failed_count: number;
  status: "draft" | "sending" | "completed" | "paused" | "cancelled";
  scheduled_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Fetch recent sends ─────────────────────────────────────────────────
export function useSendHistory(limit = 100) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["whatsapp-sends", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_sends" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as SendRecord[];
    },
    enabled: !!profile?.company_id,
  });
}

// ── Fetch batches ───────────────────────────────────────────────────────
export function useBatches() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["whatsapp-batches", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_send_batches" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as BatchRecord[];
    },
    enabled: !!profile?.company_id,
  });
}

// ── Create manual send ──────────────────────────────────────────────────
export function useCreateManualSend() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      phone: string;
      client_name: string;
      bot_id: string;
      language: string;
      template_name?: string;
      template_vars?: string[];
    }) => {
      const record = {
        company_id: profile?.company_id,
        created_by: user?.id,
        send_type: "manual",
        status: "pending",
        phone: params.phone,
        client_name: params.client_name || null,
        bot_id: params.bot_id,
        language: params.language,
        template_name: params.template_name || null,
        template_vars: params.template_vars || [],
      };
      const { data, error } = await supabase
        .from("whatsapp_sends" as any)
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SendRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-sends"] });
    },
  });
}

// ── Create batch ────────────────────────────────────────────────────────
export function useCreateBatch() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      batch_type: "bulk" | "scheduled";
      name: string;
      bot_id: string;
      language: string;
      template_name: string;
      file_name?: string;
      total_count: number;
      scheduled_at?: string;
      rows: { phone: string; clientName?: string; vars: string[] }[];
    }) => {
      // 1. Create the batch record
      const batch = {
        company_id: profile?.company_id,
        created_by: user?.id,
        batch_type: params.batch_type,
        name: params.name,
        bot_id: params.bot_id,
        language: params.language,
        template_name: params.template_name,
        file_name: params.file_name || null,
        total_count: params.total_count,
        status: params.batch_type === "scheduled" ? "draft" : "draft",
        scheduled_at: params.scheduled_at || null,
        is_active: true,
      };
      const { data: batchData, error: batchErr } = await supabase
        .from("whatsapp_send_batches" as any)
        .insert(batch)
        .select()
        .single();
      if (batchErr) throw batchErr;

      const batchId = (batchData as any).id;

      // 2. Insert all individual send records
      const sendRecords = params.rows.map((row) => ({
        company_id: profile?.company_id,
        created_by: user?.id,
        send_type: params.batch_type,
        status: "pending",
        phone: row.phone,
        client_name: row.clientName || null,
        bot_id: params.bot_id,
        language: params.language,
        template_name: params.template_name,
        template_vars: row.vars,
        batch_id: batchId,
      }));

      // Insert in chunks of 100
      for (let i = 0; i < sendRecords.length; i += 100) {
        const chunk = sendRecords.slice(i, i + 100);
        const { error: sendErr } = await supabase
          .from("whatsapp_sends" as any)
          .insert(chunk);
        if (sendErr) throw sendErr;
      }

      return batchData as unknown as BatchRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-batches"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-sends"] });
    },
  });
}

// ── Update batch (edit scheduled, toggle active, etc.) ──────────────────
export function useUpdateBatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; updates: Partial<BatchRecord> }) => {
      const { data, error } = await supabase
        .from("whatsapp_send_batches" as any)
        .update({ ...params.updates, updated_at: new Date().toISOString() })
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as BatchRecord;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-batches"] });
    },
  });
}

// ── Update individual send status ───────────────────────────────────────
export function useUpdateSendStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; status: string; error_message?: string }) => {
      const updates: any = { status: params.status };
      if (params.status === "sent") updates.sent_at = new Date().toISOString();
      if (params.error_message) updates.error_message = params.error_message;

      const { error } = await supabase
        .from("whatsapp_sends" as any)
        .update(updates)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-sends"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-batches"] });
    },
  });
}

// ── Delete batch ────────────────────────────────────────────────────────
export function useDeleteBatch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from("whatsapp_send_batches" as any)
        .delete()
        .eq("id", batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-batches"] });
      qc.invalidateQueries({ queryKey: ["whatsapp-sends"] });
      toast.success("Lote eliminado");
    },
  });
}
