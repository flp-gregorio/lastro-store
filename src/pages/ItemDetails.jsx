import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Info, FileText, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { apiUrl } from '../api';

const ItemDetails = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {}
    }
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const response = await fetch(apiUrl(`/api/pecas/${id}`));
      if (!response.ok) throw new Error('Not found');
      const data = await response.json();
      setItem(data);
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!item) return;
    setApproving(true);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') || currentUser?.role || 'EquipeLastro';
    const userId = localStorage.getItem('userId') || currentUser?.id || 'curador';

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
        'x-user-id': userId
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(apiUrl(`/api/pecas/${item.id}/status`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'APPROVED', expertName: 'Curadoria Lastro' })
      });

      if (response.ok) {
        await fetchItem();
      }
    } catch (err) {
      console.error('Erro ao aprovar peça:', err);
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]"></div>
      </div>
    );
  }

  if (!item) return <div className="text-center py-24 bg-[#0a0a0a] text-white">Peça não encontrada</div>;

  const s = String(item.status || '').toUpperCase();
  const isPending = s === 'UNDER_VALIDATION' || s === 'EM REVISÃO' || s === 'PENDENTE';
  const isApproved = s === 'APPROVED' || s === 'VERIFICADO' || s === 'DISPONÍVEL';

  const isStoreRep =
    currentUser?.role === 'EquipeLastro' ||
    currentUser?.role === 'RepresentanteLoja' ||
    currentUser?.role === 'Loja' ||
    currentUser?.role === 'Admin';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen bg-[#0a0a0a]">
      <Link
        to="/catalogo"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-sans uppercase tracking-widest text-xs"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
      </Link>

      {/* Prominent Verification Status Banner */}
      {isPending ? (
        <div className="mb-8 p-4 bg-amber-950/30 border border-amber-500/40 rounded flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
            <div>
              <span className="text-xs font-sans font-bold uppercase tracking-widest text-amber-300 block">
                STATUS: UNDER VALIDATION (Aguardando Validação)
              </span>
              <p className="text-xs text-amber-200/80 font-sans mt-0.5">
                Esta peça foi submetida pelo proprietário e está aguardando homologação e laudo técnico da Curadoria Lastro.
              </p>
            </div>
          </div>

          {isStoreRep && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="bg-[#A69076] hover:bg-[#b8a287] text-black px-4 py-2 font-sans uppercase tracking-widest text-xs font-semibold rounded flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {approving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Homologando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Aprovar Produto
                </>
              )}
            </button>
          )}
        </div>
      ) : isApproved ? (
        <div className="mb-8 p-4 bg-emerald-950/30 border border-emerald-500/40 rounded flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="text-xs font-sans font-bold uppercase tracking-widest text-emerald-300 block">
              STATUS: APPROVED (Homologado e Verificado)
            </span>
            <p className="text-xs text-emerald-200/80 font-sans mt-0.5">
              Originalidade, procedência e estado de conservação conferidos e homologados com Passaporte Digital ativo.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Imagem */}
        <div className="relative aspect-square lg:aspect-[4/5] bg-[#111] rounded overflow-hidden border border-gray-800">
          <img
            src={item.image}
            alt={item.name}
            className="object-cover w-full h-full opacity-90"
          />
        </div>

        {/* Detalhes */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-sans tracking-widest uppercase text-[#A69076]">
              {item.category}
            </p>
            <span
              className={`text-[10px] uppercase tracking-widest font-sans font-bold px-2.5 py-1 rounded border ${
                isPending
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : isApproved
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-gray-800 text-gray-400 border-gray-700'
              }`}
            >
              {isPending ? 'UNDER VALIDATION' : isApproved ? 'APPROVED' : item.status}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-serif mb-6 text-white">{item.name}</h1>
          <p className="text-2xl font-sans text-gray-200 mb-8">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
          </p>

          <div className="prose prose-invert font-sans text-gray-400 mb-12">
            <p>{item.description}</p>
          </div>

          {/* Passaporte Digital Section */}
          <div className="bg-[#111] border border-gray-800 p-6 md:p-8 mb-8 rounded">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-6 h-6 text-[#A69076]" />
              <h3 className="text-xl font-serif text-white">Passaporte Digital</h3>
            </div>

            <div className="space-y-4 font-sans text-sm">
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">ID do Passaporte</span>
                <span className="text-gray-200 tracking-wider font-mono">{item.passportId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Status de Verificação</span>
                <span
                  className={`uppercase tracking-widest text-xs font-semibold ${
                    isPending ? 'text-amber-400' : isApproved ? 'text-emerald-400' : 'text-gray-300'
                  }`}
                >
                  {isPending ? 'UNDER VALIDATION' : isApproved ? 'APPROVED' : item.status}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Procedência</span>
                <span className="text-gray-200">{item.provenance || 'Não informado'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Estado de Conservação</span>
                <span className="text-gray-200">{item.conservationState || 'Excelente'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Perito / Curadoria</span>
                <span className="text-gray-200">{item.expertName}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Data do Laudo</span>
                <span className="text-gray-200">{item.expertDate}</span>
              </div>
            </div>

            <Link
              to={`/passaporte/${item.shareToken || item.passportId}?origem=link_compartilhado`}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-white text-black py-3 font-sans uppercase tracking-widest text-xs font-medium hover:bg-gray-200 transition-colors rounded"
            >
              <FileText className="w-4 h-4" /> Acessar Passaporte Completo
            </Link>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 bg-[#A69076] text-black py-4 font-sans uppercase tracking-widest text-sm font-semibold hover:bg-[#b8a287] transition-colors rounded">
              Enviar Proposta
            </button>
            <button className="px-6 border border-gray-600 hover:border-white transition-colors flex items-center justify-center rounded">
              <Info className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;
