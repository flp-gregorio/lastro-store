import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Info, FileText, Heart, Check } from 'lucide-react';
import { apiUrl, getCurrentUserId } from '../api';

const ItemDetails = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingWishlist, setSavingWishlist] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchItemAndWishlistStatus = async () => {
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
    };
    fetchItemAndWishlistStatus();
  }, [id]);

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!item) return <div className="text-center py-24">Peça não encontrada</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      <Link to="/catalogo" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-sans uppercase tracking-widest text-xs">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Imagem */}
        <div className="relative aspect-square lg:aspect-[4/5] bg-[#111]">
          <img
            src={item.image}
            alt={item.name}
            className="object-cover w-full h-full opacity-90"
          />
        </div>

        {/* Detalhes */}
        <div className="flex flex-col justify-center">
          <p className="text-sm font-sans tracking-widest uppercase text-gray-500 mb-4">
            {item.category}
          </p>
          <h1 className="text-4xl md:text-5xl font-serif mb-6">{item.name}</h1>
          <p className="text-2xl font-sans text-gray-200 mb-8">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
          </p>

          <div className="prose prose-invert font-sans text-gray-400 mb-12">
            <p>{item.description}</p>
          </div>

          {/* Passaporte Digital Section */}
          <div className="bg-[#111] border border-gray-800 p-6 md:p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-serif text-white">Passaporte Digital</h3>
            </div>

            <div className="space-y-4 font-sans text-sm">
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">ID do Passaporte</span>
                <span className="text-gray-200 tracking-wider font-mono">{item.passportId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Status</span>
                <span className="text-emerald-400 uppercase tracking-widest text-xs font-medium">{item.status}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Perito Responsável</span>
                <span className="text-gray-200">{item.expertName}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Data do Laudo</span>
                <span className="text-gray-200">{item.expertDate}</span>
              </div>
            </div>

            <Link
              to={`/passaporte/${item.shareToken || item.passportId}?origem=link_compartilhado`}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-white text-black py-3 font-sans uppercase tracking-widest text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              <FileText className="w-4 h-4" /> Acessar Passaporte Completo
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="flex-1 bg-white text-black py-4 font-sans uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors cursor-pointer">
              Enviar Proposta
            </button>
            <button
              onClick={handleSalvarNaLista}
              disabled={savingWishlist || savedSuccess}
              className={[
                'flex-1 py-4 px-6 font-sans uppercase tracking-widest text-xs font-semibold transition-colors flex items-center justify-center gap-2 border',
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
            <button className="px-6 py-4 sm:py-0 border border-gray-600 hover:border-white transition-colors flex items-center justify-center cursor-pointer">
              <Info className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;
