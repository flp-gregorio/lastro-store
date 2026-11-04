import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  ArrowLeft,
  Copy,
  Check,
  Clock,
  MapPin,
  Star,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  QrCode,
  Share2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  History,
  Sparkles,
  Lock,
  Link2,
  RotateCcw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
// In dev the Vite proxy forwards /api → http://localhost:3000/api (no CORS issues).
// In production set VITE_API_URL to the full backend base URL.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Thin horizontal rule with optional label */
const SectionDivider = ({ label }) => (
  <div className="flex items-center gap-4 my-8">
    <div className="flex-1 h-px bg-[#1e1e1e]" />
    {label && (
      <span className="text-[9px] uppercase tracking-[0.25em] text-gray-600 font-sans whitespace-nowrap">
        {label}
      </span>
    )}
    <div className="flex-1 h-px bg-[#1e1e1e]" />
  </div>
);

/** A single data row: label + value */
const DataRow = ({ label, value, mono = false, highlight = false, children }) => (
  <div className="flex items-start justify-between gap-4 py-3.5 border-b border-[#161616] last:border-0">
    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-sans pt-0.5 shrink-0 w-36">
      {label}
    </span>
    {children ? (
      <div className="text-right flex-1">{children}</div>
    ) : (
      <span
        className={[
          'text-sm text-right flex-1',
          mono ? 'font-mono text-xs tracking-wider' : 'font-sans',
          highlight ? 'text-emerald-400 font-medium' : 'text-gray-200',
        ].join(' ')}
      >
        {value ?? 'Não informado'}
      </span>
    )}
  </div>
);

/** Conservation score dots */
const ConservationScore = ({ score }) => {
  if (!score) return <span className="text-sm text-gray-500 font-sans">Não informado</span>;
  return (
    <div className="flex items-center gap-1.5 justify-end">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={[
            'w-2.5 h-2.5 rounded-full border',
            i < score
              ? 'bg-[#A69076] border-[#A69076]'
              : 'bg-transparent border-gray-700',
          ].join(' ')}
        />
      ))}
      <span className="text-xs text-gray-400 font-sans ml-1">{score}/5</span>
    </div>
  );
};

/** History timeline entry */
const TimelineEntry = ({ entry, isFirst }) => (
  <div className="relative pl-8 pb-8 last:pb-0">
    {/* vertical line */}
    <div className="absolute left-[9px] top-3 bottom-0 w-px bg-[#1e1e1e]" />
    {/* dot */}
    <div
      className={[
        'absolute left-0 top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center',
        isFirst
          ? 'border-[#A69076] bg-[#0a0a0a]'
          : 'border-[#2a2a2a] bg-[#111]',
      ].join(' ')}
    >
      {isFirst && (
        <div className="w-2 h-2 rounded-full bg-[#A69076]" />
      )}
    </div>
    <div className="ml-2">
      <span
        className={[
          'block text-[10px] uppercase tracking-widest font-sans mb-1',
          isFirst ? 'text-[#A69076]' : 'text-gray-500',
        ].join(' ')}
      >
        {entry.date}
      </span>
      <h5 className="text-sm text-white font-sans mb-0.5">{entry.title}</h5>
      {entry.details && entry.details !== 'Não informado' && (
        <p className="text-xs text-gray-500 font-sans leading-relaxed">{entry.details}</p>
      )}
      {entry.verifiedBy && entry.verifiedBy !== 'Não informado' && (
        <p className="text-[10px] text-gray-600 font-sans mt-1 uppercase tracking-wider">
          Verificado por: {entry.verifiedBy}
        </p>
      )}
    </div>
  </div>
);

/** Copy-to-clipboard button with confirmation feedback */
const CopyButton = ({ text, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={[
        'p-1.5 rounded transition-colors',
        copied
          ? 'text-emerald-400'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/5',
        className,
      ].join(' ')}
      title={copied ? 'Copiado!' : 'Copiar'}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
};

/** QR Code modal overlay */
const QrModal = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-[#111] border border-[#2a2a2a] p-8 flex flex-col items-center gap-6 max-w-xs w-full mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-[#A69076]">
        <QrCode size={18} />
        <span className="text-xs uppercase tracking-widest font-sans">QR Code do Passaporte</span>
      </div>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}&bgcolor=111111&color=A69076&margin=10`}
        alt="QR Code do Passaporte"
        className="w-56 h-56"
      />
      <p className="text-[10px] text-gray-500 font-sans text-center leading-relaxed">
        Escaneie para acessar o Passaporte Digital desta peça
      </p>
      <button
        onClick={onClose}
        className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-sans"
      >
        Fechar
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Error States
// ---------------------------------------------------------------------------

const ErrorRevoked = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="w-16 h-16 rounded-full border border-orange-900/50 bg-orange-900/10 flex items-center justify-center mx-auto mb-6">
        <ShieldX size={28} className="text-orange-500" />
      </div>
      <h1 className="text-2xl font-serif text-white mb-3">Passaporte Revogado</h1>
      <p className="text-gray-400 font-sans text-sm leading-relaxed mb-8">
        Este link ou QR Code foi revogado pelo proprietário e o passaporte não está disponível para consulta.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-sans"
      >
        <ArrowLeft size={14} />
        Voltar ao início
      </Link>
    </div>
  </div>
);

const ErrorNotFound = () => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="w-16 h-16 rounded-full border border-red-900/50 bg-red-900/10 flex items-center justify-center mx-auto mb-6">
        <ShieldAlert size={28} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-serif text-white mb-3">Passaporte Não Encontrado</h1>
      <p className="text-gray-400 font-sans text-sm leading-relaxed mb-8">
        Passaporte não encontrado ou link inválido. Verifique o endereço ou escaneie o QR Code novamente.
      </p>
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-sans"
      >
        <ArrowLeft size={14} />
        Explorar catálogo
      </Link>
    </div>
  </div>
);

const ErrorGeneric = ({ message }) => (
  <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <AlertTriangle size={36} className="text-yellow-600 mx-auto mb-6" />
      <h1 className="text-xl font-serif text-white mb-3">Erro ao carregar passaporte</h1>
      <p className="text-gray-400 font-sans text-sm leading-relaxed mb-8">
        {message || 'Ocorreu um erro inesperado. Tente novamente em instantes.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors font-sans"
      >
        <RefreshCw size={14} />
        Tentar novamente
      </button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-24">
    <div className="max-w-5xl mx-auto px-4 md:px-8 animate-pulse">
      {/* breadcrumb */}
      <div className="h-3 w-48 bg-[#1a1a1a] rounded mb-10" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* image */}
        <div className="lg:col-span-5">
          <div className="aspect-[4/5] bg-[#111] rounded" />
          <div className="h-3 w-24 bg-[#1a1a1a] rounded mt-4 mx-auto" />
        </div>

        {/* details */}
        <div className="lg:col-span-7 space-y-4">
          <div className="h-4 w-20 bg-[#1a1a1a] rounded" />
          <div className="h-10 w-72 bg-[#1a1a1a] rounded" />
          <div className="h-3 w-48 bg-[#1a1a1a] rounded" />
          <div className="h-px bg-[#161616] my-6" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 w-28 bg-[#1a1a1a] rounded" />
              <div className="h-3 w-32 bg-[#1a1a1a] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Share Panel (shown to owner via param `?owner=true` or future auth)
// ---------------------------------------------------------------------------

const SharePanel = ({ passport, onRevoke }) => {
  const [showQr, setShowQr] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const shareUrl = passport?.sharing?.shareUrl || window.location.href;
  const qrTargetUrl = passport?.sharing?.qrTargetUrl || window.location.href;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch { /* silent */ }
  };

  const handleRevoke = async () => {
    if (!confirm('Revogar o link tornará este passaporte inacessível publicamente. Continuar?')) return;
    setRevoking(true);
    try {
      const res = await fetch(`${API_BASE}/passaportes/${passport.passportId}/revogar`, {
        method: 'POST',
      });
      if (res.ok) {
        setRevoked(true);
        onRevoke?.();
      }
    } catch { /* silent */ } finally {
      setRevoking(false);
    }
  };

  if (revoked) {
    return (
      <div className="bg-orange-900/10 border border-orange-900/30 p-4 text-center">
        <p className="text-xs text-orange-400 font-sans uppercase tracking-widest">
          Link revogado com sucesso
        </p>
      </div>
    );
  }

  return (
    <>
      {showQr && <QrModal url={qrTargetUrl} onClose={() => setShowQr(false)} />}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Share2 size={14} className="text-[#A69076]" />
          <span className="text-[10px] uppercase tracking-widest text-[#A69076] font-sans">
            Painel de Compartilhamento
          </span>
        </div>

        {/* URL */}
        <div className="flex items-center gap-2 bg-[#111] border border-[#1e1e1e] px-3 py-2">
          <Link2 size={12} className="text-gray-500 shrink-0" />
          <span className="text-xs font-mono text-gray-400 flex-1 truncate">{shareUrl}</span>
          <button
            onClick={handleCopyUrl}
            className="shrink-0 text-gray-500 hover:text-white transition-colors"
          >
            {copiedUrl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowQr(true)}
            className="flex-1 flex items-center justify-center gap-2 border border-[#2a2a2a] py-2.5 text-xs uppercase tracking-widest text-gray-300 hover:border-[#A69076] hover:text-[#A69076] transition-colors font-sans"
          >
            <QrCode size={13} />
            QR Code
          </button>
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="flex-1 flex items-center justify-center gap-2 border border-red-900/40 py-2.5 text-xs uppercase tracking-widest text-red-500/70 hover:border-red-700 hover:text-red-400 transition-colors font-sans disabled:opacity-50"
          >
            {revoking ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RotateCcw size={13} />
            )}
            Revogar
          </button>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

const Passaporte = () => {
  const { identifier } = useParams();
  const [searchParams] = useSearchParams();

  const origin = searchParams.get('origem') || searchParams.get('origin') || 'direto';
  // The backend distinguishes owner vs visitor. We expose an ?owner=1 query for demo purposes.
  // In a real app this would come from an auth token / session.
  const isOwnerParam = searchParams.get('owner') === '1' || searchParams.get('owner') === 'true';

  const [passport, setPassport] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'revoked' | 'not_found' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [openSection, setOpenSection] = useState('autenticidade'); // accordion
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);

  // -------------------------------------------------------------------------
  // Fetch passport
  // -------------------------------------------------------------------------
  const fetchPassport = useCallback(async () => {
    setStatus('loading');
    try {
      // Build query params to send to backend
      const params = new URLSearchParams({ origem: origin });
      const anonId = sessionStorage.getItem('lastro_anon_id');
      if (anonId) params.set('anonymousId', anonId);

      const res = await fetch(`${API_BASE}/passaportes/${identifier}?${params.toString()}`);
      const json = await res.json();

      if (res.status === 404) {
        setStatus('not_found');
        return;
      }

      if (res.status === 410) {
        setStatus('revoked');
        return;
      }

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(json.message || 'Erro ao carregar passaporte.');
        return;
      }

      setPassport(json.passport);
      setTracking(json.tracking);

      // Persist anonymous ID for attribution across the session
      if (json.tracking?.anonymousId) {
        sessionStorage.setItem('lastro_anon_id', json.tracking.anonymousId);
      }

      setStatus('ok');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Falha de conexão. Verifique sua internet e tente novamente.');
    }
  }, [identifier, origin]);

  useEffect(() => {
    fetchPassport();
  }, [fetchPassport]);

  // -------------------------------------------------------------------------
  // Render guards
  // -------------------------------------------------------------------------
  if (status === 'loading') return <LoadingSkeleton />;
  if (status === 'revoked') return <ErrorRevoked />;
  if (status === 'not_found') return <ErrorNotFound />;
  if (status === 'error') return <ErrorGeneric message={errorMsg} />;

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const isOwner = tracking?.isOwner || isOwnerParam;
  const hasHistory = Array.isArray(passport.history) && passport.history.length > 0;
  const shareActive = passport.shareStatus === 'active';

  const statusColors = {
    'verificado': 'text-emerald-400 border-emerald-900/40 bg-emerald-900/10',
    'em revisão': 'text-yellow-500 border-yellow-900/40 bg-yellow-900/10',
    'disponível': 'text-sky-400 border-sky-900/40 bg-sky-900/10',
    'vendido': 'text-gray-500 border-gray-800 bg-[#111]',
  };
  const statusClass = statusColors[passport.status?.toLowerCase()] || 'text-gray-400 border-gray-800 bg-[#111]';

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------
  return (
    <>
      {showQrModal && (
        <QrModal
          url={passport.sharing?.qrTargetUrl || window.location.href}
          onClose={() => setShowQrModal(false)}
        />
      )}

      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-32">
        <div className="max-w-5xl mx-auto px-4 md:px-8">

          {/* ---- Breadcrumb ---- */}
          <nav className="flex items-center gap-2 mb-10 text-[9px] uppercase tracking-widest text-gray-600 font-sans">
            <Link to="/" className="hover:text-[#A69076] transition-colors">Início</Link>
            <ChevronRight size={10} />
            <Link to="/catalogo" className="hover:text-[#A69076] transition-colors">Catálogo</Link>
            <ChevronRight size={10} />
            <span className="text-[#A69076]">Passaporte Digital</span>
          </nav>

          {/* ---- Origin / channel badge (from tracking) ---- */}
          {tracking?.origin && tracking.origin !== 'direto' && (
            <div className="mb-6 inline-flex items-center gap-2 border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-1.5 text-[9px] uppercase tracking-widest text-gray-500 font-sans">
              <ExternalLink size={10} />
              Acessado via: {tracking.origin.replace(/_/g, ' ')}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

            {/* ==============================================================
                LEFT COLUMN — Image + QR + Share
            ============================================================== */}
            <div className="lg:col-span-5 space-y-5">

              {/* Product Image */}
              <div className="relative aspect-[4/5] bg-[#111] overflow-hidden group">
                {passport.image ? (
                  <img
                    src={passport.image}
                    alt={passport.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                    <Sparkles size={40} strokeWidth={1} />
                  </div>
                )}

                {/* Verified overlay */}
                <div className="absolute top-4 left-4">
                  <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm border border-[#A69076]/30 px-2.5 py-1.5">
                    <ShieldCheck size={12} className="text-[#A69076]" />
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#A69076] font-sans">
                      Lastro Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Passport ID badge */}
              <div className="border border-[#1e1e1e] bg-[#0d0d0d] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-gray-600 font-sans mb-1">
                      ID do Passaporte
                    </p>
                    <p className="text-xs font-mono text-gray-300 tracking-widest">
                      {passport.passportId}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <CopyButton text={passport.passportId} />
                    <button
                      onClick={() => setShowQrModal(true)}
                      className="p-1.5 rounded text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
                      title="Ver QR Code"
                    >
                      <QrCode size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <div className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] uppercase tracking-widest font-sans ${statusClass}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-75" />
                {passport.status}
              </div>

              {/* Share panel (owner only) */}
              {isOwner && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowSharePanel((p) => !p)}
                    className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500 hover:text-[#A69076] transition-colors font-sans mb-3"
                  >
                    <Share2 size={12} />
                    {showSharePanel ? 'Ocultar opções de compartilhamento' : 'Compartilhar passaporte'}
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${showSharePanel ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {showSharePanel && (
                    <SharePanel passport={passport} onRevoke={fetchPassport} />
                  )}
                </div>
              )}

              {/* Lock indicator */}
              <div className="flex items-center gap-2 text-gray-700 text-[9px] uppercase tracking-widest font-sans">
                <Lock size={10} />
                Registro imutável · Lastro Digital Passport
              </div>
            </div>

            {/* ==============================================================
                RIGHT COLUMN — All passport data
            ============================================================== */}
            <div className="lg:col-span-7">

              {/* Product header */}
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-sans mb-2">
                {passport.category}
              </p>
              <h1 className="text-3xl md:text-4xl font-serif text-white leading-tight mb-4">
                {passport.name}
              </h1>

              {/* Price */}
              {passport.price > 0 && (
                <p className="text-xl font-sans text-gray-200 mb-2">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(passport.price)}
                </p>
              )}

              {/* Description */}
              {passport.description && passport.description !== 'Não informado' && (
                <p className="text-sm text-gray-400 font-sans leading-relaxed mt-4 mb-6">
                  {passport.description}
                </p>
              )}

              <SectionDivider label="Passaporte Digital" />

              {/* ---- Accordion ---- */}
              <div className="space-y-1">

                {/* === Autenticidade === */}
                <AccordionSection
                  id="autenticidade"
                  open={openSection}
                  onToggle={setOpenSection}
                  icon={<ShieldCheck size={15} className="text-[#A69076]" />}
                  label="Autenticidade & Avaliação"
                >
                  <DataRow label="Perito Responsável" value={passport.expertName} />
                  <DataRow label="Data do Laudo" value={passport.expertDate} />
                  <DataRow label="Estado de Conservação" value={passport.conservationState} />
                  <DataRow label="Pontuação">
                    <ConservationScore score={passport.conservationScore} />
                  </DataRow>
                </AccordionSection>

                {/* === Procedência === */}
                <AccordionSection
                  id="procedencia"
                  open={openSection}
                  onToggle={setOpenSection}
                  icon={<MapPin size={15} className="text-[#A69076]" />}
                  label="Procedência"
                >
                  <DataRow label="Procedência" value={passport.provenance} />
                  <DataRow label="Publicação" value={passport.isPublished ? 'Publicado' : 'Não publicado'} />
                </AccordionSection>

                {/* === Histórico === */}
                <AccordionSection
                  id="historico"
                  open={openSection}
                  onToggle={setOpenSection}
                  icon={<History size={15} className="text-[#A69076]" />}
                  label="Histórico de Custódia"
                  badge={hasHistory ? passport.history.length : null}
                >
                  {hasHistory ? (
                    <div className="pt-2">
                      {passport.history.map((entry, i) => (
                        <TimelineEntry key={i} entry={entry} isFirst={i === 0} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 font-sans py-2">
                      Histórico não informado para esta peça.
                    </p>
                  )}
                </AccordionSection>

                {/* === Rastreabilidade === */}
                <AccordionSection
                  id="rastreabilidade"
                  open={openSection}
                  onToggle={setOpenSection}
                  icon={<Clock size={15} className="text-[#A69076]" />}
                  label="Rastreabilidade"
                >
                  <DataRow
                    label="Token de Compartilhamento"
                    value={passport.shareToken || 'Não gerado'}
                    mono
                  />
                  <DataRow
                    label="Status do Link"
                    value={shareActive ? 'Ativo' : passport.shareStatus}
                    highlight={shareActive}
                  />
                  {passport.shareRevokedAt && (
                    <DataRow
                      label="Revogado em"
                      value={new Date(passport.shareRevokedAt).toLocaleString('pt-BR')}
                    />
                  )}
                  {tracking && (
                    <>
                      <DataRow label="Canal de Acesso" value={tracking.firstOrigin || tracking.origin} />
                      <DataRow label="Acesso do Proprietário" value={tracking.isOwner ? 'Sim' : 'Não'} />
                    </>
                  )}
                </AccordionSection>
              </div>

              {/* ---- CTA ---- */}
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  to={`/peca/${passport.id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3.5 font-sans uppercase tracking-widest text-xs font-medium hover:bg-[#f0ebe1] transition-colors"
                >
                  <ExternalLink size={13} />
                  Ver Peça no Catálogo
                </Link>
                <button
                  onClick={() => setShowQrModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 border border-[#2a2a2a] py-3.5 font-sans uppercase tracking-widest text-xs text-gray-300 hover:border-[#A69076] hover:text-[#A69076] transition-colors"
                >
                  <QrCode size={13} />
                  Gerar QR Code
                </button>
              </div>

              {/* ---- Tracking info ---- */}
              {tracking?.eventId && (
                <p className="mt-6 text-[9px] text-gray-700 font-sans font-mono text-right">
                  event:{tracking.eventId}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Accordion helper
// ---------------------------------------------------------------------------

const AccordionSection = ({ id, open, onToggle, icon, label, badge, children }) => {
  const isOpen = open === id;
  return (
    <div className="border border-[#161616] bg-[#0a0a0a]">
      <button
        onClick={() => onToggle(isOpen ? null : id)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#0d0d0d] transition-colors"
      >
        {icon}
        <span className="flex-1 text-xs uppercase tracking-widest text-gray-300 font-sans">
          {label}
        </span>
        {badge != null && (
          <span className="text-[9px] bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/30 px-2 py-0.5 rounded-full font-sans">
            {badge}
          </span>
        )}
        <ChevronDown
          size={14}
          className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-[#161616]">
          {children}
        </div>
      )}
    </div>
  );
};

export default Passaporte;
