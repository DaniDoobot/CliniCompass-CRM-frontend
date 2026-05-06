import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mic, Square, Loader2, Plus, FileText, History, Trash2, Edit3, Play, Pause, Calendar as CalendarIcon, User, X,
} from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { usePatientSessions, useSessionEntries, useManageSession } from "@/hooks/usePatientSessions";
import { useVoiceEdit } from "@/hooks/useVoiceEdit";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  entityType: "patient" | "contact";
  entityId: string;
}

type VoiceTarget = { mode: "new" } | { mode: "append"; sessionId: string; sessionNumber: number };

export function SessionNotesSection({ entityType, entityId }: Props) {
  const { data: sessions, isLoading } = usePatientSessions(entityType, entityId);
  const { synopsis, isLoadingSynopsis } = useVoiceEdit(entityType, entityId);
  const manage = useManageSession(entityType, entityId);
  const audioRecorder = useAudioRecorder({ entityType, entityId, folder: "session-notes" });

  const [createOpen, setCreateOpen] = useState(false);
  const [createContent, setCreateContent] = useState("");
  const [appendOpen, setAppendOpen] = useState<{ id: string; n: number } | null>(null);
  const [appendContent, setAppendContent] = useState("");
  const [editOpen, setEditOpen] = useState<any>(null);
  const [editSummary, setEditSummary] = useState("");
  const [deleteOpen, setDeleteOpen] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState<any>(null);

  const [voiceStatus, setVoiceStatus] = useState<"idle" | "recording" | "processing">("idle");
  const [voiceTarget, setVoiceTarget] = useState<VoiceTarget | null>(null);

  const startVoice = useCallback(async (target: VoiceTarget) => {
    setVoiceTarget(target);
    setVoiceStatus("recording");
    try {
      const result = await audioRecorder.startRecording();
      setVoiceStatus("processing");
      if (!result.transcription) {
        toast.error("No se pudo transcribir el audio");
        setVoiceStatus("idle");
        setVoiceTarget(null);
        return;
      }
      if (target.mode === "new") {
        await manage.mutateAsync({
          action: "create",
          source: "voice",
          initial_content: result.transcription,
          transcription: result.transcription,
          audio_file_path: result.audioFilePath,
        });
        toast.success("Nueva sesión creada por voz");
      } else {
        await manage.mutateAsync({
          action: "add_entry",
          session_id: target.sessionId,
          source: "voice",
          content: result.transcription,
          transcription: result.transcription,
          audio_file_path: result.audioFilePath,
        });
        toast.success(`Aportación añadida a la sesión ${target.sessionNumber}`);
      }
      setVoiceStatus("idle");
      setVoiceTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Error al procesar");
      setVoiceStatus("idle");
      setVoiceTarget(null);
    }
  }, [audioRecorder, manage]);

  const stopVoice = useCallback(() => audioRecorder.stopRecording(), [audioRecorder]);

  const handleCreateManual = async () => {
    if (!createContent.trim()) return;
    try {
      await manage.mutateAsync({ action: "create", source: "manual", initial_content: createContent.trim() });
      toast.success("Sesión creada");
      setCreateOpen(false);
      setCreateContent("");
    } catch (err: any) { toast.error(err.message || "Error"); }
  };

  const handleAppendManual = async () => {
    if (!appendOpen || !appendContent.trim()) return;
    try {
      await manage.mutateAsync({
        action: "add_entry",
        session_id: appendOpen.id,
        source: "manual",
        content: appendContent.trim(),
      });
      toast.success(`Aportación añadida a la sesión ${appendOpen.n}`);
      setAppendOpen(null);
      setAppendContent("");
    } catch (err: any) { toast.error(err.message || "Error"); }
  };

  const handleSaveSummary = async () => {
    if (!editOpen) return;
    try {
      await manage.mutateAsync({ action: "update_session", session_id: editOpen.id, summary: editSummary });
      toast.success("Resumen actualizado");
      setEditOpen(null);
    } catch (err: any) { toast.error(err.message || "Error"); }
  };

  const handleDelete = async () => {
    if (!deleteOpen) return;
    try {
      await manage.mutateAsync({ action: "delete", session_id: deleteOpen.id });
      toast.success(`Sesión ${deleteOpen.session_number} eliminada`);
      setDeleteOpen(null);
    } catch (err: any) { toast.error(err.message || "Error"); }
  };

  const isVoiceActive = voiceStatus !== "idle";

  return (
    <div className="space-y-4">
      {/* ==================== Sinopsis global ==================== */}
      <div className="stat-card">
        <h3 className="text-sm font-semibold font-heading text-foreground mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Sinopsis global del paciente
        </h3>
        {isLoadingSynopsis ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : synopsis?.content ? (
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{synopsis.content}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            La sinopsis se construirá automáticamente a partir de los resúmenes de cada sesión.
          </p>
        )}
      </div>

      {/* ==================== Cabecera + acciones ==================== */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-heading text-foreground">Sesiones clínicas</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => setCreateOpen(true)}
            disabled={isVoiceActive}
          >
            <Plus className="h-4 w-4" /> Nueva sesión
          </Button>
          {!isVoiceActive ? (
            <Button
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => startVoice({ mode: "new" })}
            >
              <Mic className="h-4 w-4" /> Nueva sesión por voz
            </Button>
          ) : voiceStatus === "recording" ? (
            <Button size="sm" variant="destructive" className="gap-1.5 animate-pulse" onClick={stopVoice}>
              <Square className="h-4 w-4" /> Detener
            </Button>
          ) : (
            <Button size="sm" disabled className="gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
            </Button>
          )}
        </div>
      </div>

      {/* ==================== Lista de sesiones ==================== */}
      {isLoading ? (
        <div className="stat-card flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : !sessions?.length ? (
        <div className="stat-card text-center py-12">
          <p className="text-sm text-muted-foreground mb-1">Sin sesiones todavía</p>
          <p className="text-xs text-muted-foreground">Crea la primera sesión clínica de este paciente.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="stat-card">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-bold font-heading text-foreground">
                      Sesión {s.session_number}
                    </h4>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(s.session_date), "dd/MM/yyyy", { locale: es })}
                    </span>
                    {s.professional && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {s.professional.first_name} {s.professional.last_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Historial interno"
                    onClick={() => setHistoryOpen(s)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    title="Editar resumen"
                    onClick={() => { setEditOpen(s); setEditSummary(s.summary || ""); }}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Eliminar sesión"
                    onClick={() => setDeleteOpen(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {s.summary ? (
                <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed mb-3">
                  {s.summary}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground italic mb-3">Sin contenido todavía</p>
              )}

              <div className="flex gap-2 pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => { setAppendOpen({ id: s.id, n: s.session_number }); setAppendContent(""); }}
                  disabled={isVoiceActive}
                >
                  <Plus className="h-3.5 w-3.5" /> Añadir info
                </Button>
                {voiceTarget?.mode === "append" && voiceTarget.sessionId === s.id ? (
                  voiceStatus === "recording" ? (
                    <Button size="sm" variant="destructive" className="gap-1.5 text-xs animate-pulse" onClick={stopVoice}>
                      <Square className="h-3.5 w-3.5" /> Detener
                    </Button>
                  ) : (
                    <Button size="sm" disabled className="gap-1.5 text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando…
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => startVoice({ mode: "append", sessionId: s.id, sessionNumber: s.session_number })}
                    disabled={isVoiceActive}
                  >
                    <Mic className="h-3.5 w-3.5" /> Añadir por voz
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== CREATE manual ==================== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva sesión</DialogTitle>
            <DialogDescription>
              Se creará la sesión {(sessions?.[0]?.session_number ?? 0) + 1} con la fecha de hoy. Puedes añadir el contenido inicial.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={createContent}
            onChange={(e) => setCreateContent(e.target.value)}
            placeholder="Describe lo ocurrido en la sesión: motivo, observaciones, plan…"
            className="min-h-[140px] text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateManual} disabled={manage.isPending || !createContent.trim()}>
              {manage.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Crear sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== APPEND manual ==================== */}
      <Dialog open={!!appendOpen} onOpenChange={(o) => !o && setAppendOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir información a la sesión {appendOpen?.n}</DialogTitle>
            <DialogDescription>El resumen de la sesión se actualizará integrando esta nueva aportación.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={appendContent}
            onChange={(e) => setAppendContent(e.target.value)}
            placeholder="Nueva información a añadir…"
            className="min-h-[140px] text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAppendOpen(null)}>Cancelar</Button>
            <Button onClick={handleAppendManual} disabled={manage.isPending || !appendContent.trim()}>
              {manage.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Añadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT summary ==================== */}
      <Dialog open={!!editOpen} onOpenChange={(o) => !o && setEditOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar resumen — Sesión {editOpen?.session_number}</DialogTitle>
            <DialogDescription>
              Edita el resumen manualmente. Si añades nueva información a la sesión más adelante, se reconciliará con tu edición.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            className="min-h-[200px] text-sm"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(null)}>Cancelar</Button>
            <Button onClick={handleSaveSummary} disabled={manage.isPending}>
              {manage.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE ==================== */}
      <AlertDialog open={!!deleteOpen} onOpenChange={(o) => !o && setDeleteOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la sesión {deleteOpen?.session_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará la sesión y todas sus aportaciones internas. La sinopsis global se recalculará. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== HISTORY ==================== */}
      <Dialog open={!!historyOpen} onOpenChange={(o) => !o && setHistoryOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial interno — Sesión {historyOpen?.session_number}</DialogTitle>
            <DialogDescription>Aportaciones realizadas a esta sesión (manual / voz). No se muestran en la vista principal.</DialogDescription>
          </DialogHeader>
          {historyOpen && <SessionHistoryList sessionId={historyOpen.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================
function SessionHistoryList({ sessionId }: { sessionId: string }) {
  const { data: entries, isLoading } = useSessionEntries(sessionId);
  if (isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (!entries?.length) return <p className="text-sm text-muted-foreground">Sin aportaciones.</p>;
  return (
    <div className="space-y-2">
      {entries.map((e, i) => (
        <div key={e.id} className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">
              Aportación {i + 1} · {format(new Date(e.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
            </span>
            <div className="flex items-center gap-1.5">
              {e.audio_file_path && <AudioPlayer filePath={e.audio_file_path} />}
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full",
                e.source === "voice" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {e.source === "voice" ? "🎤 Voz" : "✍️ Manual"}
              </span>
            </div>
          </div>
          <p className="text-sm text-foreground whitespace-pre-line">{e.content}</p>
          {e.transcription && e.transcription !== e.content && (
            <p className="text-xs text-muted-foreground italic mt-2 border-t border-border/40 pt-2">
              Transcripción: "{e.transcription}"
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function AudioPlayer({ filePath }: { filePath: string }) {
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlay = async () => {
    if (playing && audio) { audio.pause(); setPlaying(false); return; }
    if (!audio) {
      const { data } = await supabase.storage.from("patient-audios").createSignedUrl(filePath, 3600);
      if (data?.signedUrl) {
        const a = new Audio(data.signedUrl);
        a.onended = () => setPlaying(false);
        setAudio(a);
        a.play();
        setPlaying(true);
      }
    } else {
      audio.play(); setPlaying(true);
    }
  };
  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handlePlay} title="Reproducir audio">
      {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
    </Button>
  );
}
