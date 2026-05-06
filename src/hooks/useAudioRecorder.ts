import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type RecordingStatus = "idle" | "recording" | "processing" | "done" | "error";

interface UseAudioRecorderOptions {
  entityType: "patient" | "contact";
  entityId: string;
  /** Subfolder inside bucket: "voice-edits" or "session-notes" */
  folder: "voice-edits" | "session-notes";
}

interface RecordingResult {
  transcription: string | null;
  audioFilePath: string | null;
}

export function useAudioRecorder({ entityType, entityId, folder }: UseAudioRecorderOptions) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const resolveRef = useRef<((result: RecordingResult) => void) | null>(null);

  const startRecording = useCallback((): Promise<RecordingResult> => {
    return new Promise(async (resolve, reject) => {
      try {
        resolveRef.current = resolve;
        transcriptRef.current = "";
        chunksRef.current = [];

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Start MediaRecorder for audio blob
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          setStatus("processing");

          // Upload audio
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          let audioFilePath: string | null = null;

          try {
            const timestamp = Date.now();
            const path = `${folder}/${entityType}/${entityId}/${timestamp}.webm`;
            const { error: uploadErr } = await supabase.storage
              .from("patient-audios")
              .upload(path, audioBlob, { contentType: "audio/webm", upsert: false });

            if (!uploadErr) {
              audioFilePath = path;
            } else {
              console.error("Audio upload error:", uploadErr);
            }
          } catch (err) {
            console.error("Audio upload failed:", err);
          }

          // Get transcription from SpeechRecognition (already accumulated)
          const transcription = transcriptRef.current.trim() || null;

          resolveRef.current?.({ transcription, audioFilePath });
          resolveRef.current = null;
        };

        // Start SpeechRecognition in parallel
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.lang = "es-ES";
          recognition.interimResults = false;
          recognition.continuous = true;
          recognition.maxAlternatives = 1;
          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                transcriptRef.current += event.results[i][0].transcript + " ";
              }
            }
          };
          recognition.onerror = () => {};
          recognition.onend = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        }

        recorder.start();
        mediaRecorderRef.current = recorder;
        setStatus("recording");
      } catch (err) {
        setStatus("error");
        reject(err);
      }
    });
  }, [entityType, entityId, folder]);

  const stopRecording = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    mediaRecorderRef.current?.stop();
  }, []);

  const getAudioUrl = useCallback((filePath: string) => {
    const { data } = supabase.storage.from("patient-audios").getPublicUrl(filePath);
    return data?.publicUrl || null;
  }, []);

  const getSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("patient-audios")
      .createSignedUrl(filePath, 3600); // 1 hour
    if (error) {
      console.error("Signed URL error:", error);
      return null;
    }
    return data?.signedUrl || null;
  }, []);

  return {
    status,
    setStatus,
    startRecording,
    stopRecording,
    getSignedUrl,
  };
}
