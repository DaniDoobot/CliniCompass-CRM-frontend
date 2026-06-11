import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useStaffSchedules(staffProfileId: string | null) {
  return useQuery({
    queryKey: ["staff-schedules", staffProfileId],
    queryFn: async () => {
      if (!staffProfileId) return [];
      const { data, error } = await supabase
        .from("staff_schedules" as any)
        .select("*")
        .eq("staff_profile_id", staffProfileId);

      if (error) throw error;
      return data;
    },
    enabled: !!staffProfileId,
  });
}

export function useSaveStaffSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { staff_profile_id: string; day_of_week: number; start_time: string; end_time: string; center_id: string | null }) => {
      const { data, error } = await supabase
        .from("staff_schedules" as any)
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["staff-schedules", variables.staff_profile_id] });
    },
  });
}

export function useDeleteStaffSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_schedules" as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-schedules"] });
    },
  });
}

export function useStaffTimeOff(staffProfileId: string | null) {
  return useQuery({
    queryKey: ["staff-time-off", staffProfileId],
    queryFn: async () => {
      if (!staffProfileId) return [];
      const { data, error } = await supabase
        .from("staff_time_off" as any)
        .select("*")
        .eq("staff_profile_id", staffProfileId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!staffProfileId,
  });
}

export function useSaveStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { staff_profile_id: string; start_date: string; end_date: string; reason: string | null }) => {
      const { data, error } = await supabase
        .from("staff_time_off" as any)
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["staff-time-off", variables.staff_profile_id] });
    },
  });
}

export function useDeleteStaffTimeOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("staff_time_off" as any)
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-time-off"] });
    },
  });
}
