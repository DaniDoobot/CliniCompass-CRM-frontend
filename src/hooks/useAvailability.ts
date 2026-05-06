import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAvailabilitySlots(filters?: {
  center_id?: string;
  professional_id?: string;
  service_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["availability-slots", filters],
    queryFn: async () => {
      let query = supabase
        .from("availability_slots")
        .select("*, professional:staff_profiles(first_name, last_name), center:centers(name), service:services(name, business_line, duration_minutes), appointment:appointments(id, status, contact_id)")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (filters?.center_id && filters.center_id !== "all") {
        query = query.eq("center_id", filters.center_id);
      }
      if (filters?.professional_id && filters.professional_id !== "all") {
        query = query.eq("professional_id", filters.professional_id);
      }
      if (filters?.service_id && filters.service_id !== "all") {
        query = query.eq("service_id", filters.service_id);
      }
      if (filters?.date_from) {
        query = query.gte("date", filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte("date", filters.date_to);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status as "disponible" | "ocupado" | "bloqueado");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: Record<string, any>) => {
      const { data, error } = await supabase
        .from("availability_slots")
        .insert(slot as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}

export function useCreateAvailabilitySlotsBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slots: Record<string, any>[]) => {
      const { data, error } = await supabase
        .from("availability_slots")
        .insert(slots as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}

export function useUpdateAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("availability_slots")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useDeleteAvailabilitySlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("availability_slots")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
    },
  });
}

export function useBookSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      slotId,
      contactId,
      centerId,
      serviceId,
      professionalId,
      startTime,
      endTime,
      notes,
    }: {
      slotId: string;
      contactId: string;
      centerId: string;
      serviceId?: string | null;
      professionalId?: string | null;
      startTime: string;
      endTime: string;
      notes?: string | null;
    }) => {
      // Create appointment
      const { data: apt, error: aptErr } = await supabase
        .from("appointments")
        .insert({
          patient_id: contactId, // legacy field
          contact_id: contactId,
          center_id: centerId,
          service_id: serviceId || null,
          professional_id: professionalId || null,
          start_time: startTime,
          end_time: endTime,
          notes: notes || null,
        })
        .select()
        .single();
      if (aptErr) throw aptErr;

      // Mark slot as occupied
      const { error: slotErr } = await supabase
        .from("availability_slots")
        .update({ status: "ocupado" as any, appointment_id: apt.id })
        .eq("id", slotId);
      if (slotErr) throw slotErr;

      return apt;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["contact-appointments"] });
    },
  });
}

export function useFreeSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase
        .from("availability_slots")
        .update({ status: "disponible" as any, appointment_id: null })
        .eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["availability-slots"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
