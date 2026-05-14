import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appointments-api`;
const HEADERS = {
  "Content-Type": "application/json",
  "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
};

export async function getPatientIdByPhone(phone: string): Promise<string | null> {
  const normalizedPhone = phone.replace(/\D/g, "");
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/patients?select=id&phone=eq.%2B${normalizedPhone}`,
    { headers: HEADERS }
  );
  if (!res.ok) {
    const resFallback = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/patients?select=id&phone=eq.${normalizedPhone}`,
      { headers: HEADERS }
    );
    if (!resFallback.ok) return null;
    const data = await resFallback.json();
    return data[0]?.id || null;
  }
  const data = await res.json();
  return data[0]?.id || null;
}

export function useAppointments(filters?: { center_id?: string; professional_id?: string; date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.center_id && filters.center_id !== "all") params.append("center_id", filters.center_id);
      if (filters?.professional_id && filters.professional_id !== "all") params.append("professional_id", filters.professional_id);
      if (filters?.date_from) params.append("date_from", filters.date_from);
      if (filters?.date_to) params.append("date_to", filters.date_to);

      const res = await fetch(`${API_URL}?${params.toString()}`, { headers: HEADERS });
      if (!res.ok) throw new Error("Error fetching appointments from API");
      const result = await res.json();
      return result.data;
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (apt: AppointmentInsert) => {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(apt),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error creating appointment");
      }
      const result = await res.json();
      return result.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase
        .from("appointments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}

export function useStaffProfiles() {
  return useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*, center:centers(name)")
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}
