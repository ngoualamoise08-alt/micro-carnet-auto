import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Loader2,
  Volume2,
  AlertCircle,
  CheckCircle2,
  Radio,
  FileAudio,
  Type,
  Upload,
  Info,
  ExternalLink,
} from 'lucide-react';

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
  // Mode selection: 'live' (Web Speech API), 'record' (MediaRecorder), 'text' (Quick text/mobile dictation), 'upload' (Audio file)
  const [activeTab, setActiveTab] = useState<'live' | 'record' | 'text' | 'upload'>('live');

  // Common state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // ----------------------------------------------------
  // 1. Microphone Hardware / Permission Diagnostics
  // ----------------------------------------------------
  const [micStatus, setMicStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt' | 'unsupported'>('checking');
  const [micDeviceLabel, setMicDeviceLabel] = useState<string>('');

  const checkMicPermissions = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicStatus('unsupported');
      return;
    }

    try {
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: 'microphone' as any });
        setMicStatus(perm.state as any);
        perm.onchange = () => {
          setMicStatus(perm.state as any);
        };
      }
    } catch {
      // Ignore permission query error (unsupported in some browsers)
    }
  };

  useEffect(() => {
    checkMicPermissions();
  }, []);

  const testMicAccess = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Votre navigateur ne supporte pas l\'accès direct au micro (mediaDevices non disponible).');
      }

      // Try basic audio request
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      if (tracks.length > 0) {
        setMicDeviceLabel(tracks[0].label || 'Microphone par défaut');
        setMicStatus('granted');
        setSuccessMessage(`Microphone opérationnel : ${tracks[0].label || 'Microphone système actif'}`);
        // Immediately release
        tracks.forEach((t) => t.stop());
      }
    } catch (err: any) {
      console.warn('Mic test error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicStatus('denied');
        setErrorMessage(
          'Accès micro refusé. Veuillez autoriser le microphone dans la barre d’adresse de votre navigateur (icône cadenas ou caméra/micro) puis recharger la page.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicStatus('unsupported');
        setErrorMessage('Aucun microphone matériel détecté sur cet appareil.');
      } else {
        setErrorMessage(`Erreur microphone : ${err.message || 'Impossible d\'activer le matériel audio'}`);
      }
    }
  };

  // ----------------------------------------------------
  // 2. Mode Web Speech API (Live Dictation with real-time text)
  // ----------------------------------------------------
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [speechApiSupported, setSpeechApiSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechApiSupported(false);
      // If Web Speech is not supported, default to MediaRecorder
      if (activeTab === 'live') {
        setActiveTab('record');
      }
    }
  }, [activeTab]);

  const startLiveDictation = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage('La reconnaissance vocale directe n’est pas supportée par ce navigateur. Utilisez le mode Enregistreur Audio.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let currentTranscript = transcriptionText;

      recognition.onstart = () => {
        setIsLiveListening(true);
        setMicStatus('granted');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += piece + ' ';
          } else {
            interim += piece;
          }
        }

        if (final) {
          currentTranscript = (currentTranscript ? currentTranscript + ' ' : '') + final.trim();
          setTranscriptionText(currentTranscript);
        } else if (interim) {
          // Show interim in preview without permanently committing
          setTranscriptionText((currentTranscript ? currentTranscript + ' ' : '') + interim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setMicStatus('denied');
          setErrorMessage('Permission microphone refusée. Autorisez le micro dans votre navigateur.');
          setIsLiveListening(false);
        } else if (event.error === 'no-speech') {
          // Normal timeout if silence, do not break
        } else {
          setErrorMessage(`Information dictée : ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsLiveListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setErrorMessage('Impossible de lancer la reconnaissance vocale. Vérifiez les autorisations de votre micro.');
      setIsLiveListening(false);
    }
  };

  const stopLiveDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsLiveListening(false);
  };

  // ----------------------------------------------------
  // 3. Mode MediaRecorder (HD Audio capture with visualizer)
  // ----------------------------------------------------
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
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
      if (!AudioCtx) return;
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
      console.warn('Audio visualizer not supported or failed:', e);
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

  const startMediaRecording = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    audioChunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        'Votre navigateur ne permet pas l\'enregistrement audio direct. Utilisez la saisie / dictée clavier ci-dessous.'
      );
      return;
    }

    let stream: MediaStream;
    try {
      // First try with enhanced constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        // Fallback to simple audio constraint
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      setMicStatus('granted');
      startVisualizer(stream);

      // Determine supported mimeType
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        }
      }

      const recorderOptions = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopVisualizer();
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        setAudioBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setRecordDuration(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicStatus('denied');
        setErrorMessage(
          'Accès au microphone refusé. Cliquez sur l’icône de cadenas à gauche de l’URL dans votre navigateur pour régler le micro sur "Autoriser".'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setMicStatus('unsupported');
        setErrorMessage('Aucun microphone audio n’a été détecté sur votre ordinateur ou smartphone.');
      } else {
        setErrorMessage(`Impossible d’activer le micro (${err.name || 'Erreur'}): ${err.message || 'Vérifiez les paramètres audio.'}`);
      }
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

  const stopMediaRecording = () => {
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')
    ) {
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
    stopMediaRecording();
    stopLiveDictation();
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordDuration(0);
    setErrorMessage(null);
    setSuccessMessage(null);
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

  // ----------------------------------------------------
  // 4. File Upload (Audio memos / Dictaphone import)
  // ----------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|m4a|wav|ogg|webm|aac|flac)$/i)) {
      setErrorMessage('Veuillez sélectionner un fichier audio valide (MP3, M4A, WAV, OGG, WEBM).');
      return;
    }

    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setSuccessMessage(`Fichier audio chargé : ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} Mo)`);
  };

  // ----------------------------------------------------
  // 5. Backend AI Transcription & Structured Extraction
  // ----------------------------------------------------
  const transcribeAudio = async () => {
    if (!audioBlob) return;

    setIsTranscribing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
      setSuccessMessage('Transcription terminée avec succès !');
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(
        err.message || 'Une erreur est survenue lors de la transcription. Vous pouvez également saisir vos notes directement.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const analyzeAndFillForm = async (overrideText?: string) => {
    const textToProcess = (overrideText !== undefined ? overrideText : transcriptionText).trim();

    if (!audioBlob && !textToProcess) {
      setErrorMessage('Veuillez enregistrer une dictée vocale ou saisir un texte avant de lancer l’analyse.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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
          mimeType: audioBlob ? audioBlob.type || 'audio/webm' : undefined,
          text: textToProcess || undefined,
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
      setSuccessMessage('Fiche d\'intervention mise à jour avec succès à partir de votre dictée !');
    } catch (err: any) {
      console.error('Audio analysis error:', err);
      setErrorMessage(
        err.message || 'Une erreur est survenue lors de l\'analyse IA. Vous pouvez remplir le formulaire manuellement.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="bg-white border-2 border-blue-900/20 rounded-2xl shadow-sm overflow-hidden mb-6">
      {/* Header Bar */}
      <div className="bg-blue-900 px-4 py-3 flex flex-wrap items-center justify-between text-white gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300">
              Dictée Vocale & Saisie de l'Intervention
            </h2>
            <p className="text-xs text-blue-100">
              Dictez ou décrivez vos travaux, pièces remplacées et kilométrage
            </p>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="flex items-center gap-2">
          {isLiveListening && (
            <div className="flex items-center gap-2 bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-400/60 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-xs font-bold text-emerald-300">
                Écoute continue active
              </span>
            </div>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 bg-red-950/90 px-2.5 py-1 rounded-md border border-red-400/60">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono text-xs font-bold text-red-300">
                REC {formatDuration(recordDuration)}
              </span>
            </div>
          )}

          {/* Quick mic test button */}
          <button
            type="button"
            onClick={testMicAccess}
            className="text-[11px] font-semibold bg-blue-800/80 hover:bg-blue-700 px-2.5 py-1 rounded border border-blue-300/40 text-blue-100 flex items-center gap-1 transition-colors cursor-pointer"
            title="Tester le matériel microphone"
          >
            <Radio className="w-3.5 h-3.5 text-amber-300" />
            <span>Tester micro</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'live'
              ? 'border-blue-700 text-blue-900 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Mic className={`w-4 h-4 ${isLiveListening ? 'text-emerald-600 animate-pulse' : 'text-blue-700'}`} />
          <span>Dictée en direct (Temps réel)</span>
          {speechApiSupported && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
              Direct
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('record')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'record'
              ? 'border-blue-700 text-blue-900 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Volume2 className="w-4 h-4 text-blue-700" />
          <span>Enregistreur Audio HD (IA)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'text'
              ? 'border-blue-700 text-blue-900 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Type className="w-4 h-4 text-blue-700" />
          <span>Saisie / Dictée clavier mobile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'upload'
              ? 'border-blue-700 text-blue-900 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Upload className="w-4 h-4 text-blue-700" />
          <span>Importer un mémo audio</span>
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {/* Error Notification with Help Advice */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold">{errorMessage}</div>
              <div className="text-[11px] text-red-700 leading-relaxed">
                💡 <strong>Conseil :</strong> Si votre micro est bloqué par le navigateur, cliquez sur l'icône de cadenas ou caméra à gauche de la barre d'adresse pour autoriser le micro, ou utilisez l'onglet <strong>« Saisie / Dictée clavier mobile »</strong> pour dicter directement via le micro de votre clavier.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-700 font-bold ml-2 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2.5 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-500 hover:text-emerald-800 font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 1: LIVE DICTATION (Web Speech API) */}
        {/* ==================================================== */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-start gap-3 text-xs text-slate-700">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <strong>Reconnaissance vocale directe en temps réel :</strong> Vos paroles s'affichent instantanément à l'écran mot à mot pendant que vous parlez. Idéal pour les téléphones, tablettes et ordinateurs d'atelier.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {!isLiveListening ? (
                <button
                  type="button"
                  onClick={startLiveDictation}
                  disabled={isProcessing}
                  className="w-full sm:flex-1 min-h-[52px] px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-3 border-2 border-slate-950/10 cursor-pointer disabled:opacity-50"
                >
                  <Mic className="w-6 h-6 text-slate-950 animate-bounce" />
                  <span>Activer le micro & Démarrer la dictée en direct</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopLiveDictation}
                  className="w-full sm:flex-1 min-h-[52px] px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Square className="w-5 h-5" />
                  <span>Arrêter l'écoute du micro</span>
                </button>
              )}

              {transcriptionText && (
                <button
                  type="button"
                  onClick={() => setTranscriptionText('')}
                  className="h-10 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Effacer texte</span>
                </button>
              )}
            </div>

            {/* Listening animation wave */}
            {isLiveListening && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Le microphone vous écoute... Parlez naturellement (ex: "Révision Renault Master 140000 km...")
                </span>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: MEDIA RECORDER (HD Audio + Gemini) */}
        {/* ==================================================== */}
        {activeTab === 'record' && (
          <div className="space-y-4">
            {/* Dynamic Waveform Visualizer */}
            {isRecording && (
              <div className="bg-slate-900 p-4 rounded-xl flex flex-col items-center justify-center">
                <div className="text-xs text-amber-400 font-mono uppercase tracking-widest mb-2 font-semibold">
                  {isPaused ? 'Enregistrement en pause' : 'Captation microphone active'}
                </div>
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
                  Durée enregistrée : {formatDuration(recordDuration)}
                </div>
              </div>
            )}

            {/* Audio Player Preview */}
            {audioUrl && !isRecording && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={handlePlayPausePreview}
                    className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-sm hover:bg-blue-800 transition-colors shrink-0 cursor-pointer"
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      Enregistrement audio prêt {recordDuration > 0 && `(${formatDuration(recordDuration)})`}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Écoutez votre dictée avant traitement automatique
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
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-blue-100/60 transition-colors shrink-0 cursor-pointer"
                  title="Recommencer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Recorder Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {!isRecording && !audioUrl && (
                <button
                  type="button"
                  onClick={startMediaRecording}
                  disabled={isProcessing}
                  className="w-full min-h-[52px] px-6 py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 border-2 border-amber-400/50"
                >
                  <Mic className="w-6 h-6 text-amber-400" />
                  <span>Enregistrer l'audio HD au microphone</span>
                </button>
              )}

              {isRecording && (
                <div className="grid grid-cols-2 gap-3 w-full">
                  {isPaused ? (
                    <button
                      type="button"
                      onClick={resumeRecording}
                      className="min-h-[48px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                      <span>Reprendre</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseRecording}
                      className="min-h-[48px] px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={stopMediaRecording}
                    className="min-h-[48px] px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Square className="w-4 h-4" />
                    <span>Terminer l'audio</span>
                  </button>
                </div>
              )}

              {audioUrl && !isRecording && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={transcribeAudio}
                    disabled={isTranscribing || isProcessing}
                    className="min-h-[46px] px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isTranscribing ? (
                      <>
                        <Loader2 className="w-4 h-4 text-blue-700 animate-spin" />
                        <span>Transcription en cours...</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 text-blue-700" />
                        <span>Transcrire l'audio</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => analyzeAndFillForm()}
                    disabled={isProcessing || isTranscribing}
                    className="min-h-[46px] px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 border border-slate-950/20 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                        <span>Extraction en cours...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>Extraire & Remplir formulaire</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: QUICK TEXT / MOBILE KEYBOARD DICTATION */}
        {/* ==================================================== */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              📱 <strong>Sur smartphone (Android ou iPhone) :</strong> Touchez la zone ci-dessous puis appuyez sur l'icône <strong>Microphone de votre clavier</strong> (Gboard ou Dictée iOS) pour dicter vos propos sans aucune restriction de navigateur !
            </div>

            <textarea
              rows={4}
              value={transcriptionText}
              onChange={(e) => setTranscriptionText(e.target.value)}
              placeholder="Exemple : Révision complète sur Renault Master EK-842-WX à 140 000 km. Vidange moteur avec 7 litres d'huile 5W30 C3 et remplacement filtre à huile. Remplacement plaquettes de frein avant usées. Pression des pneus effectuée. Véhicule conforme et prêt à rouler par Moise."
              className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all font-sans text-slate-900 leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setTranscriptionText('')}
                className="h-8 px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded transition-colors"
              >
                Effacer
              </button>

              <button
                type="button"
                onClick={() => analyzeAndFillForm(transcriptionText)}
                disabled={isProcessing || !transcriptionText.trim()}
                className="min-h-[44px] px-5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                    <span>Traitement en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Extraire & Remplir la fiche</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4: AUDIO FILE IMPORT (Voice Memo / Dictaphone) */}
        {/* ==================================================== */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac,.flac"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-600 bg-slate-50 hover:bg-blue-50/50 p-6 rounded-2xl text-center cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-800 mx-auto flex items-center justify-center mb-3">
                <FileAudio className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                Cliquez pour importer un enregistrement vocal
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Formats acceptés : M4A (Mémos Vocaux iPhone), MP3, WAV, OGG, WEBM. Importez directement vos mémos dictés à l'atelier.
              </p>
            </div>

            {audioUrl && (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={handlePlayPausePreview}
                    className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center shadow-sm hover:bg-blue-800 transition-colors shrink-0 cursor-pointer"
                  >
                    {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="text-xs font-bold text-slate-900 truncate">
                    Fichier prêt pour analyse
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => analyzeAndFillForm()}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Analyser ce fichier</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* COMMON TRANSCRIPTION PREVIEW & EDIT BOX */}
        {/* ==================================================== */}
        {transcriptionText && (
          <div className="mt-5 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Texte de la dictée
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                  {transcriptionText.length} caractères
                </span>
              </div>

              <button
                type="button"
                onClick={() => analyzeAndFillForm(transcriptionText)}
                disabled={isProcessing}
                className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extraction...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Remplir la fiche d'intervention</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              rows={3}
              value={transcriptionText}
              onChange={(e) => setTranscriptionText(e.target.value)}
              className="w-full text-xs text-slate-800 font-sans leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-600"
              placeholder="Le texte transcrit s'affiche ici. Vous pouvez le corriger manuellement si nécessaire."
            />
          </div>
        )}
      </div>
    </section>
  );
};
