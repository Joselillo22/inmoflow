"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Check } from "lucide-react";

interface VoiceNoteProps {
  onRecorded: (audioBlob: Blob, duration: number) => void;
}

export function VoiceNote({ onRecorded }: VoiceNoteProps) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recorded, setRecorded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecorded(blob, duration);
        setRecorded(true);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecorded(false);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch {
      // El usuario denegó el permiso del micrófono
    }
  }, [duration, onRecorded]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recording]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3">
      {!recording && !recorded && (
        <Button size="lg" variant="danger" onClick={startRecording} className="gap-2">
          <Mic className="h-6 w-6" />
          Grabar nota de voz
        </Button>
      )}

      {recording && (
        <>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-danger animate-pulse" />
            <span className="text-lg font-mono font-semibold">{formatDuration(duration)}</span>
          </div>
          <Button size="lg" variant="secondary" onClick={stopRecording} className="gap-2">
            <Square className="h-5 w-5" />
            Parar
          </Button>
        </>
      )}

      {recorded && !recording && (
        <div className="flex items-center gap-2 text-success">
          <Check className="h-5 w-5" />
          <span className="font-medium">Nota grabada ({formatDuration(duration)})</span>
        </div>
      )}
    </div>
  );
}
