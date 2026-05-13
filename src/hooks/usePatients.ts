import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Patient = Database["public"]["Tables"]["patients"]["Row"];
type PatientInsert = Database["public"]["Tables"]["patients"]["Insert"];

export function usePatients(filters?: { center_id?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["patients", filters],
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select("*, center:centers(name), professional:staff_profiles!patients_assigned_professional_id_fkey(first_name, last_name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters?.center_id && filters.center_id !== "all") {
        query = query.eq("center_id", filters.center_id);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status as any);
      }
      if (filters?.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,nif.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: ["patient", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*, center:centers(name), professional:staff_profiles!patients_assigned_professional_id_fkey(first_name, last_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function usePatientAppointments(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-appointments", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appointments-api?patient_id=${patientId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error("Error fetching patient appointments from API");
      const result = await res.json();
      return result.data;
    },
  });
}

export function usePatientDocuments(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-documents", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, document_type:document_types(name, category)")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePatientInteractions(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-interactions", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interactions")
        .select("*")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function usePatientPacks(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-packs", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_packs")
        .select("*, service:services(name)")
        .eq("patient_id", patientId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patient: PatientInsert) => {
      const { data, error } = await supabase.from("patients").insert(patient).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}

export function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Patient> & { id: string }) => {
      const { data, error } = await supabase.from("patients").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", data.id] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patients").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}
