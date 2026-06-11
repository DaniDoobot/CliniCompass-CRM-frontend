import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addMinutes, format, isBefore, isAfter, parseISO, startOfDay, endOfDay, isSameDay } from "date-fns";

export function useDynamicAvailability(filters?: {
  center_id?: string;
  professional_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ["dynamic-availability", filters],
    queryFn: async () => {
      // 1. Fetch schedules
      let schedQuery = supabase.from("staff_schedules").select("*, professional:staff_profiles(first_name, last_name)").eq("is_active", true);
      if (filters?.center_id && filters.center_id !== "all") {
        schedQuery = schedQuery.eq("center_id", filters.center_id);
      }
      if (filters?.professional_id && filters.professional_id !== "all") {
        schedQuery = schedQuery.eq("staff_profile_id", filters.professional_id);
      }
      const { data: schedules, error: schedErr } = await schedQuery;
      if (schedErr) throw schedErr;

      // 2. Fetch time off
      let timeOffQuery = supabase.from("staff_time_off").select("*");
      if (filters?.center_id && filters.center_id !== "all") {
        timeOffQuery = timeOffQuery.or(`center_id.eq.${filters.center_id},center_id.is.null`);
      }
      if (filters?.professional_id && filters.professional_id !== "all") {
        timeOffQuery = timeOffQuery.eq("staff_profile_id", filters.professional_id);
      }
      if (filters?.date_from) {
        timeOffQuery = timeOffQuery.gte("end_date", filters.date_from);
      }
      if (filters?.date_to) {
        timeOffQuery = timeOffQuery.lte("start_date", filters.date_to + "T23:59:59");
      }
      const { data: timeOffs, error: timeOffErr } = await timeOffQuery;
      if (timeOffErr) throw timeOffErr;

      // 3. Fetch appointments to filter out booked time
      let aptQuery = supabase.from("appointments").select("id, start_time, end_time, professional_id, status").not("status", "eq", "cancelada");
      if (filters?.center_id && filters.center_id !== "all") {
        aptQuery = aptQuery.eq("center_id", filters.center_id);
      }
      if (filters?.professional_id && filters.professional_id !== "all") {
        aptQuery = aptQuery.eq("professional_id", filters.professional_id);
      }
      if (filters?.date_from) {
        aptQuery = aptQuery.gte("end_time", filters.date_from);
      }
      if (filters?.date_to) {
        aptQuery = aptQuery.lte("start_time", filters.date_to + "T23:59:59");
      }
      const { data: appointments, error: aptErr } = await aptQuery;
      if (aptErr) throw aptErr;

      // Generate slots
      const generatedSlots: any[] = [];
      const startDate = filters?.date_from ? parseISO(filters.date_from) : new Date();
      const endDate = filters?.date_to ? parseISO(filters.date_to) : addMinutes(new Date(), 7 * 24 * 60);
      const DEFAULT_SLOT_DURATION = 30; // 30 mins

      // Iterate through each day in the range
      let currentDate = startOfDay(startDate);
      const limitDate = endOfDay(endDate);

      while (currentDate <= limitDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday
        const dateStr = format(currentDate, "yyyy-MM-dd");

        // Find schedules for this day of week
        const daySchedules = schedules?.filter(s => s.day_of_week === dayOfWeek) || [];

        for (const sched of daySchedules) {
          // Generate blocks for this schedule
          const [startHour, startMin] = sched.start_time.split(":");
          const [endHour, endMin] = sched.end_time.split(":");
          
          let slotStart = new Date(currentDate);
          slotStart.setHours(parseInt(startHour), parseInt(startMin), 0);
          
          const schedEnd = new Date(currentDate);
          schedEnd.setHours(parseInt(endHour), parseInt(endMin), 0);

          while (slotStart < schedEnd) {
            const slotEnd = addMinutes(slotStart, DEFAULT_SLOT_DURATION);
            if (slotEnd > schedEnd) break;

            // Check if blocked by time off
            const isBlocked = timeOffs?.some(t => {
              const tStart = parseISO(t.start_date);
              const tEnd = parseISO(t.end_date);
              return t.staff_profile_id === sched.staff_profile_id && 
                     slotStart < tEnd && slotEnd > tStart;
            });

            // Check if booked by appointment
            const isBooked = appointments?.some(a => {
              const aStart = parseISO(a.start_time);
              const aEnd = parseISO(a.end_time);
              return a.professional_id === sched.staff_profile_id &&
                     slotStart < aEnd && slotEnd > aStart;
            });

            if (!isBlocked && !isBooked) {
              generatedSlots.push({
                id: `dyn_${sched.staff_profile_id}_${dateStr}_${format(slotStart, "HH:mm")}`,
                date: dateStr,
                start_time: format(slotStart, "HH:mm"),
                end_time: format(slotEnd, "HH:mm"),
                professional_id: sched.staff_profile_id,
                center_id: sched.center_id,
                status: "disponible",
                duration_minutes: DEFAULT_SLOT_DURATION,
                professional: sched.professional,
                // These are null/undefined for generated slots
                service_id: null,
                appointment_id: null,
              });
            }

            slotStart = slotEnd;
          }
        }
        currentDate = addMinutes(currentDate, 24 * 60); // next day
      }

      return generatedSlots;
    },
  });
}
