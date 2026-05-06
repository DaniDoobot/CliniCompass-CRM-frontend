import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];
type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];

export function useLeads(filters?: { business_line?: string; status?: string; search?: string; center_id?: string }) {
  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select("*, center:centers(name), assigned:staff_profiles(first_name, last_name), stage:pipeline_stages(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters?.business_line && filters.business_line !== "all") {
        query = query.eq("business_line", filters.business_line as any);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status as any);
      }
      if (filters?.center_id && filters.center_id !== "all") {
        query = query.eq("center_id", filters.center_id);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function usePipelineStages(businessLine?: string) {
  return useQuery({
    queryKey: ["pipeline-stages", businessLine],
    queryFn: async () => {
      let query = supabase.from("pipeline_stages").select("*").order("position");
      if (businessLine && businessLine !== "all") {
        query = query.eq("business_line", businessLine as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

/** Fetch the first stage for a given business line (used when creating leads from LeadsPage) */
export function useFirstStage(businessLine: string) {
  return useQuery({
    queryKey: ["first-stage", businessLine],
    enabled: !!businessLine && businessLine !== "all",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("business_line", businessLine as any)
        .order("position", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      // If no pipeline_stage_id provided, fetch the first stage for this business_line
      let finalLead = { ...lead };
      if (!finalLead.pipeline_stage_id && finalLead.business_line) {
        const { data: firstStage } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("business_line", finalLead.business_line)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstStage) {
          finalLead.pipeline_stage_id = firstStage.id;
        }
      }
      const { data, error } = await supabase.from("leads").insert(finalLead).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}
