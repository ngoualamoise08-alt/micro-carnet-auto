import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, PenTool, UserCheck, Shield } from 'lucide-react';

interface SignaturePadProps {
  title: string;
  subtitle: string;
  signerName: string;
  onSignerNameChange: (name: string) => void;
  signatureDataUrl?: string;
  onSignatureChange: (dataUrl: string | undefined) => void;
  defaultRole?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  title,
  subtitle,
  signerName,
  onSignerNameChange,
  signatureDataUrl,
  onSignatureChange,
  defaultRole,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(Boolean(signatureDataUrl));
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const strokeHistoryRef = useRef<ImageData[]>([]);

  // Initialize canvas with high-DPI scaling
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set internal resolution
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a'; // Deep Navy ink
    ctx.lineWidth = 2.5;

    // If external signatureDataUrl is provided, draw it back onto canvas
    if (signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasDrawn(true);
      };
      img.src = signatureDataUrl;
    }
  }, [signatureDataUrl]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas]);

  const saveStateToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      strokeHistoryRef.current.push(imgData);
    } catch {
      // ignore
    }
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveStateToHistory();

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // Export to PNG data URL
    const dataUrl = canvas.toDataURL('image/png');
    onSignatureChange(dataUrl);
    setSignedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    strokeHistoryRef.current = [];
    setHasDrawn(false);
    setSignedAt(null);
    onSignatureChange(undefined);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <PenTool className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{title}</h4>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>

          {hasDrawn && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Check className="w-3 h-3" />
              Signé {signedAt && `à ${signedAt}`}
            </span>
          )}
        </div>

        {/* Signer Name Input */}
        <div className="mb-3">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
            Nom et prénom du signataire {defaultRole && <span className="text-slate-400 font-normal">({defaultRole})</span>}
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => onSignerNameChange(e.target.value)}
            placeholder="Ex: Jean Dupont"
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Touch Canvas Drawing Area */}
      <div className="relative mt-1">
        <div className="w-full h-36 bg-slate-50/70 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl overflow-hidden relative cursor-crosshair touch-none transition-colors">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            className="w-full h-full block"
          />

          {/* Guide Line & Watermark instruction when empty */}
          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 p-3 select-none">
              <PenTool className="w-6 h-6 mb-1 opacity-40 text-blue-900" />
              <span className="text-xs font-semibold text-slate-500">Signez ici avec le doigt ou le stylet</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Tactile sur mobile & tablette</span>
            </div>
          )}

          {/* Baseline guide line */}
          <div className="absolute bottom-6 left-6 right-6 border-b border-dashed border-slate-300/80 pointer-events-none flex justify-between">
            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono select-none -translate-y-3">
              ✕ Emplacement signature
            </span>
          </div>
        </div>

        {/* Canvas Toolbar Controls */}
        <div className="mt-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Valeur probante horodatée</span>
          </div>

          <div className="flex items-center gap-2">
            {hasDrawn && (
              <button
                type="button"
                onClick={clearCanvas}
                className="h-8 px-2.5 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Effacer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
