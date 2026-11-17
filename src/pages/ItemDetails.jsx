import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Info, FileText, Heart, Check, Loader2 } from 'lucide-react';
import { apiUrl, getCurrentUserId, getCurrentUser, getCurrentToken, getCurrentUserRole } from '../api';
import EscrowModal from '../components/EscrowModal';

const ItemDetails = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isEscrowOpen, setIsEscrowOpen] = useState(false);

  const fetchItemAndWishlistStatus = useCallback(async () => {
    const userId = getCurrentUserId();
    try {
      const [itemRes, listasRes] = await Promise.all([
        fetch(apiUrl(`/api/pecas/${id}`)),
        fetch(apiUrl(`/api/listas?userId=${encodeURIComponent(userId)}`)).catch(() => null)
      ]);

      if (!itemRes.ok) throw new Error('Not found');
      const data = await itemRes.json();
      setItem(data);

      if (listasRes && listasRes.ok) {
        const listas = await listasRes.json();
        if (Array.isArray(listas)) {
          const alreadyInWishlist = listas.some(
            (lista) =>
              Array.isArray(lista.itens) &&
              lista.itens.some(
                (entry) =>
                  Number(entry.peca_id) === Number(data.id) ||
                  (data.passportId && entry.passport_id === data.passportId)
              )
          );
          setSavedSuccess(alreadyInWishlist);
        }
      }
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    fetchItemAndWishlistStatus();
  }, [fetchItemAndWishlistStatus]);

  const handleApprove = async () => {
    if (!item || approving) return;
    setApproving(true);

    const token = getCurrentToken();
    const userRole = getCurrentUserRole() || currentUser?.role || 'EquipeLastro';
    const userId = getCurrentUserId() || 'curador';

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
        await fetchItemAndWishlistStatus();
        window.dispatchEvent(new Event('lastro:notifications-updated'));
      }
    } catch (err) {
      console.error('Erro ao aprovar peça:', err);
    } finally {
      setApproving(false);
    }
  };

  // Salva a peça na Lista de Desejos do usuário (criando a lista padrão se necessário)
  const handleSalvarNaLista = async () => {
    if (!item || savingWishlist || savedSuccess) return;
    setSavingWishlist(true);
    const userId = getCurrentUserId();

    try {
      const listasRes = await fetch(apiUrl(`/api/listas?userId=${encodeURIComponent(userId)}`));
      const listas = listasRes.ok ? await listasRes.json() : [];

      let targetListaId = Array.isArray(listas) && listas.length > 0 ? listas[0].id : null;

      if (!targetListaId) {
        const criarRes = await fetch(apiUrl('/api/listas'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            nome: 'Minhas peças salvas',
            tipo: 'simples'
          })
        });
        if (criarRes.ok) {
          const novaLista = await criarRes.json();
          targetListaId = novaLista.id;
        }
      }

      if (targetListaId) {
        const addRes = await fetch(apiUrl(`/api/listas/itens?userId=${encodeURIComponent(userId)}`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            listaId: targetListaId,
            pecaId: Number(item.id),
            passportId: item.passportId
          })
        });

        if (addRes.ok || addRes.status === 409) {
          setSavedSuccess(true);
          window.dispatchEvent(new Event('lastro:notifications-updated'));
        }
      }
    } catch (err) {
      console.error('Erro ao salvar peça na lista de desejos:', err);
    } finally {
      setSavingWishlist(false);
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
  const isPending = s === 'UNDER_VALIDATION' || s === 'EM REVISÃO' || s === 'EM REVISAO' || s === 'PENDENTE' || s === 'EM ANÁLISE';
  const isApproved = s === 'APPROVED' || s === 'VERIFICADO' || s === 'DISPONÍVEL' || s === 'VALIDO';
  const displayCategory = /^watches?$/i.test(String(item.category || '').trim())
    ? 'Relógios'
    : item.category || 'Peça';
  const formattedPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price || 0);

  const isStoreRep =
    currentUser?.role === 'EquipeLastro' ||
    currentUser?.role === 'RepresentanteLoja' ||
    currentUser?.role === 'Loja' ||
    currentUser?.role === 'Admin';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen bg-[#0a0a0a]">
      <Link to="/catalogo" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-sans uppercase tracking-widest text-xs">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
      </Link>

      {/* Banner de Status de Verificação */}
      {isPending ? (
        <div className="mb-8 p-4 bg-amber-950/30 border border-amber-500/40 rounded flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
            <div>
              <span className="text-xs font-sans font-bold uppercase tracking-widest text-amber-300 block">
                Status: Em análise
              </span>
              <p className="text-xs text-amber-200/80 font-sans mt-0.5">
                Esta peça foi submetida pelo proprietário e está aguardando verificação e laudo técnico da Curadoria Lastro.
              </p>
            </div>
          </div>

          {isStoreRep && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="bg-[#A69076] hover:bg-[#b8a287] text-black px-4 py-2 font-sans uppercase tracking-widest text-xs font-semibold rounded flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {approving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Verificar e Homologar Peça
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
              Status: Verificado · Passaporte Digital Homologado
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
              {displayCategory}
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
              {isPending ? 'Em análise' : isApproved ? 'Verificado' : item.status}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-serif mb-6 text-white">{item.name}</h1>
          <p className="text-2xl font-sans text-gray-200 mb-8">
            {formattedPrice}
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
                  {isPending ? 'Em análise' : isApproved ? 'Verificado' : item.status}
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

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={() => setIsEscrowOpen(true)}
              className="flex-1 bg-white text-black py-4 font-sans uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors cursor-pointer rounded"
            >
              Enviar Proposta
            </button>
            <button
              type="button"
              onClick={handleSalvarNaLista}
              disabled={savingWishlist || savedSuccess}
              className={[
                'flex-1 py-4 px-6 font-sans uppercase tracking-widest text-xs font-semibold transition-colors flex items-center justify-center gap-2 border rounded',
                savedSuccess
                  ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300 cursor-default'
                  : 'bg-[#A69076] border-[#A69076] text-black hover:bg-[#b8a287] cursor-pointer'
              ].join(' ')}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 shrink-0" /> Já adicionado à lista de desejos
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 shrink-0" /> {savingWishlist ? 'Salvando...' : 'Salvar na Lista de Desejos'}
                </>
              )}
            </button>
            <Link
              to="/como-funciona"
              className="px-6 py-4 sm:py-0 border border-gray-600 hover:border-white transition-colors flex items-center justify-center cursor-pointer rounded"
              title="Saiba como funciona a custódia Lastro"
              aria-label="Como funciona a custódia Lastro"
            >
              <Info className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </div>
      </div>

      <EscrowModal
        isOpen={isEscrowOpen}
        onClose={() => setIsEscrowOpen(false)}
        price={formattedPrice}
      />
    </div>
  );
};

export default ItemDetails;
