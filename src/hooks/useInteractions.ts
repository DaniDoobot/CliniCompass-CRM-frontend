import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InteractionInsert = Database["public"]["Tables"]["interactions"]["Insert"];

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (interaction: InteractionInsert) => {
      const { data, error } = await supabase.from("interactions").insert(interaction).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["patient-interactions"] });
      qc.invalidateQueries({ queryKey: ["lead-interactions"] });
    },
  });
}

export function useLeadInteractions(leadId: string | undefined) {
  return useQuery({
    queryKey: ["lead-interactions", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interactions")
        .select("*")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
