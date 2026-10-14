import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Sparkles, Loader2, Volume2, AlertCircle } from 'lucide-react';

interface AudioRecorderProps {
  onParsedData: (extractedData: any) => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onParsedData,
  isProcessing,
  setIsProcessing,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up timer and audio context on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        // Calculate average volume level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn('AudioContext visualizer not supported or failed to start:', e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setAudioLevel(0);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    audioChunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      startVisualizer(stream);

      // Determine supported mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopVisualizer();
        const recordedBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        // Stop all tracks to release hardware mic
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Emit chunk every 250ms
      setIsRecording(true);
      setIsPaused(false);
      setRecordDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Accès au microphone refusé. Veuillez autoriser le micro dans votre navigateur pour dicter votre intervention.'
          : 'Impossible d\'activer le microphone. Vérifiez votre matériel audio.'
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const resetRecording = () => {
    stopRecording();
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordDuration(0);
    setErrorMessage(null);
  };

  const handlePlayPausePreview = () => {
    if (!audioPlayerRef.current || !audioUrl) return;

    if (isPlayingPreview) {
      audioPlayerRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);

  const transcribeAudioWithGemini = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType: audioBlob.type || 'audio/webm',
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Échec de la transcription');
      }

      setTranscriptionText(result.transcription);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(
        err.message || 'Une erreur est survenue lors de la transcription audio par gemini-3.5-transcribe.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const analyzeAudioWithGemini = async (textOverride?: string) => {
    if (!audioBlob && !textOverride) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let base64Audio = '';
      if (audioBlob) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(audioBlob);
        base64Audio = await base64Promise;
      }

      const response = await fetch('/api/parse-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: base64Audio || undefined,
          mimeType: audioBlob ? (audioBlob.type || 'audio/webm') : undefined,
          text: textOverride || transcriptionText || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Échec de l\'analyse');
      }

      if (result.data.transcription && !transcriptionText) {
        setTranscriptionText(result.data.transcription);
      }

      onParsedData(result.data);
    } catch (err: any) {
      console.error('Audio analysis error:', err);
      setErrorMessage(
        err.message || 'Une erreur est survenue lors de l\'analyse vocale par Gemini. Vous pouvez remplir le formulaire manuellement.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="bg-white border-2 border-blue-900/20 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Header Bar */}
      <div className="bg-blue-900 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
              Dictée Vocale d'Intervention Véhicule
            </h2>
            <p className="text-xs text-blue-100">
              Dictez votre révision, diagnostic, kilométrage et pièces remplacées
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 bg-blue-950/80 px-2.5 py-1 rounded-md border border-amber-400/50">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-xs font-bold text-amber-300">
              {formatDuration(recordDuration)}
            </span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Dynamic Waveform Visualizer */}
        {isRecording && (
          <div className="mb-4 bg-slate-900 p-4 rounded-xl flex flex-col items-center justify-center">
            <div className="text-xs text-amber-400 font-mono uppercase tracking-widest mb-2 font-semibold">
              {isPaused ? 'Enregistrement en pause' : 'Captation micro active'}
            </div>
            {/* Visualizer bars */}
            <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs">
              {[...Array(16)].map((_, i) => {
                const heightPercent = isPaused
                  ? 15
                  : Math.max(12, Math.min(100, Math.sin((i + 1) * 0.4) * audioLevel + (i % 3) * 15));
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-amber-400 transition-all duration-75"
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>
            <div className="text-[11px] text-slate-300 font-mono mt-2">
              Durée : {formatDuration(recordDuration)}
            </div>
          </div>
        )}

        {/* Audio Player Preview (when recorded) */}
        {audioUrl && !isRecording && (
          <div className="mb-4 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handlePlayPausePreview}
                className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-sm hover:bg-blue-800 transition-colors shrink-0"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  Enregistrement audio prêt ({formatDuration(recordDuration)})
                </div>
                <div className="text-[11px] text-slate-500">
                  Écoutez votre dictée avant traitement IA
                </div>
              </div>
            </div>

            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
              className="hidden"
            />

            <button
              type="button"
              onClick={resetRecording}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-blue-100/60 transition-colors shrink-0"
              title="Recommencer l'enregistrement"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {!isRecording && !audioUrl && (
            <button
              type="button"
              onClick={startRecording}
              disabled={isProcessing}
              className="w-full min-h-[52px] px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-3 border-2 border-slate-950/10 cursor-pointer disabled:opacity-50"
            >
              <Mic className="w-6 h-6 text-slate-950 animate-pulse" />
              <span>Démarrer la dictée vocale</span>
            </button>
          )}

          {isRecording && (
            <div className="grid grid-cols-2 gap-3 w-full">
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="min-h-[48px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Reprendre</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="min-h-[48px] px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopRecording}
                className="min-h-[48px] px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Square className="w-4 h-4" />
                <span>Terminer</span>
              </button>
            </div>
          )}

          {audioUrl && !isRecording && (
            <div className="flex flex-col gap-3 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 1. Dedicated Transcription button using gemini-3.5-transcribe */}
                <button
                  type="button"
                  onClick={transcribeAudioWithGemini}
                  disabled={isTranscribing || isProcessing}
                  className="min-h-[48px] px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 text-blue-700 animate-spin" />
                      <span>Transcription (gemini-3.5-transcribe)...</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-blue-700" />
                      <span>Transcrire l'audio (gemini-3.5-transcribe)</span>
                    </>
                  )}
                </button>

                {/* 2. Full Extraction button */}
                <button
                  type="button"
                  onClick={() => analyzeAudioWithGemini()}
                  disabled={isProcessing || isTranscribing}
                  className="min-h-[48px] px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 border border-amber-400 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>Extraction structurée en cours...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Extraire & Remplir le formulaire</span>
                    </>
                  )}
                </button>
              </div>

              {/* Reset button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={resetRecording}
                  disabled={isProcessing || isTranscribing}
                  className="h-8 px-3 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ré-enregistrer un nouvel audio</span>
                </button>
              </div>

              {/* Live Transcription Box if available */}
              {transcriptionText && (
                <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Transcription de la dictée
                      </span>
                      <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                        Modèle : gemini-3.5-transcribe
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    {transcriptionText}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 italic">
                      Texte retranscrit avec fidélité technique
                    </span>
                    <button
                      type="button"
                      onClick={() => analyzeAudioWithGemini(transcriptionText)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Remplir les champs avec ce texte</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
