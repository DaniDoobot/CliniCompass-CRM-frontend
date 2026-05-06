import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStaffCenterServices(staffProfileId?: string) {
  return useQuery({
    queryKey: ["staff-center-services", staffProfileId],
    queryFn: async () => {
      let query = supabase
        .from("staff_center_services")
        .select("*, center:centers(id, name), service:services(id, name, business_line, duration_minutes)")
        .order("created_at", { ascending: true });

      if (staffProfileId) {
        query = query.eq("staff_profile_id", staffProfileId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: staffProfileId !== undefined,
  });
}

export function useAllStaffCenterServices() {
  return useQuery({
    queryKey: ["staff-center-services-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_center_services")
        .select("*, center:centers(id, name), service:services(id, name, business_line, duration_minutes), staff:staff_profiles(id, first_name, last_name)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useAddStaffCenterService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: { staff_profile_id: string; center_id: string; service_id: string }) => {
      const { data, error } = await supabase
        .from("staff_center_services")
        .insert(assignment as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-center-services"] });
      qc.invalidateQueries({ queryKey: ["staff-center-services-all"] });
    },
  });
}

export function useRemoveStaffCenterService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_center_services")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["staff-center-services"] });
      qc.invalidateQueries({ queryKey: ["staff-center-services-all"] });
    },
  });
}
