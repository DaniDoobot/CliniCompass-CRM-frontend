import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Clock } from "lucide-react";
import { useStaffSchedules, useSaveStaffSchedule, useDeleteStaffSchedule, useStaffTimeOff, useSaveStaffTimeOff, useDeleteStaffTimeOff } from "@/hooks/useStaffSchedules";
import { toast } from "sonner";
import { format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function SchedulesSettings() {
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const { data: staffList, isLoading: staffLoading } = useQuery({
    queryKey: ["staff-profiles-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("id, first_name, last_name")
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: schedules } = useStaffSchedules(selectedStaff);
  const saveSchedule = useSaveStaffSchedule();
  const deleteSchedule = useDeleteStaffSchedule();

  const { data: timeOff } = useStaffTimeOff(selectedStaff);
  const saveTimeOff = useSaveStaffTimeOff();
  const deleteTimeOff = useDeleteStaffTimeOff();

  const [schedForm, setSchedForm] = useState({ day_of_week: "1", start_time: "09:00", end_time: "14:00" });
  const [offForm, setOffForm] = useState({ start_date: "", end_date: "", reason: "" });

  const handleAddSchedule = async () => {
    if (!selectedStaff) return;
    try {
      await saveSchedule.mutateAsync({
        staff_profile_id: selectedStaff,
        day_of_week: parseInt(schedForm.day_of_week),
        start_time: schedForm.start_time,
        end_time: schedForm.end_time,
        center_id: null
      });
      toast.success("Horario añadido");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleAddTimeOff = async () => {
    if (!selectedStaff || !offForm.start_date || !offForm.end_date) return;
    try {
      await saveTimeOff.mutateAsync({
        staff_profile_id: selectedStaff,
        start_date: offForm.start_date,
        end_date: offForm.end_date,
        reason: offForm.reason || null
      });
      toast.success("Excepción añadida");
      setOffForm({ start_date: "", end_date: "", reason: "" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="stat-card">
        <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Seleccionar Profesional</h3>
        <Select value={selectedStaff || ""} onValueChange={setSelectedStaff}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="Elige un profesional..." />
          </SelectTrigger>
          <SelectContent>
            {staffList?.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.first_name} {staff.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStaff && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* HORARIOS BASE */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Horario Base
            </h3>
            
            <div className="flex gap-2 mb-4 items-end">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Día</Label>
                <Select value={schedForm.day_of_week} onValueChange={(v) => setSchedForm({ ...schedForm, day_of_week: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-24">
                <Label className="text-xs">Inicio</Label>
                <Input type="time" className="h-9" value={schedForm.start_time} onChange={(e) => setSchedForm({ ...schedForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5 w-24">
                <Label className="text-xs">Fin</Label>
                <Input type="time" className="h-9" value={schedForm.end_time} onChange={(e) => setSchedForm({ ...schedForm, end_time: e.target.value })} />
              </div>
              <Button size="sm" className="h-9" onClick={handleAddSchedule} disabled={saveSchedule.isPending}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Día</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!schedules?.length ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sin horario definido</TableCell></TableRow>
                ) : (
                  schedules.sort((a, b) => {
                    const dA = a.day_of_week === 0 ? 7 : a.day_of_week;
                    const dB = b.day_of_week === 0 ? 7 : b.day_of_week;
                    return dA - dB || a.start_time.localeCompare(b.start_time);
                  }).map((sched) => (
                    <TableRow key={sched.id}>
                      <TableCell className="font-medium">{DAYS_OF_WEEK.find(d => d.value === sched.day_of_week)?.label}</TableCell>
                      <TableCell>{sched.start_time.slice(0, 5)} - {sched.end_time.slice(0, 5)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteSchedule.mutate(sched.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* VACACIONES / EXCEPCIONES */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4 flex items-center gap-2">
              Vacaciones y Excepciones
            </h3>
            
            <div className="flex gap-2 mb-4 items-end flex-wrap">
              <div className="space-y-1.5 w-32">
                <Label className="text-xs">Desde</Label>
                <Input type="date" className="h-9" value={offForm.start_date} onChange={(e) => setOffForm({ ...offForm, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5 w-32">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" className="h-9" value={offForm.end_date} onChange={(e) => setOffForm({ ...offForm, end_date: e.target.value })} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[120px]">
                <Label className="text-xs">Motivo (Opcional)</Label>
                <Input className="h-9" placeholder="Vacaciones..." value={offForm.reason} onChange={(e) => setOffForm({ ...offForm, reason: e.target.value })} />
              </div>
              <Button size="sm" className="h-9 mt-1.5" onClick={handleAddTimeOff} disabled={saveTimeOff.isPending || !offForm.start_date || !offForm.end_date}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!timeOff?.length ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">Sin excepciones</TableCell></TableRow>
                ) : (
                  timeOff.map((off) => (
                    <TableRow key={off.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(off.start_date), "dd/MM/yyyy")} 
                        {off.end_date !== off.start_date && ` - ${format(new Date(off.end_date), "dd/MM/yyyy")}`}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{off.reason || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteTimeOff.mutate(off.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
