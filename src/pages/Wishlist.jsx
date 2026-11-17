import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Heart,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { apiUrl, getCurrentUserId } from '../api';

const formatCat = (c) => (/^watches?$/i.test(String(c || '').trim()) ? 'Relógios' : c);

const Wishlist = () => {
  const [listas, setListas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeListaId, setActiveListaId] = useState(null);

  const userId = getCurrentUserId();

  const carregarListas = useCallback(async () => {
    try {
      const response = await fetch(apiUrl(`/api/listas?userId=${userId}`));
      if (response.ok) {
        const data = await response.json();
        setListas(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setActiveListaId((prev) => prev || data[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar listas:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    carregarListas();
  }, [carregarListas]);

  const handleCriarLista = async () => {
    const nome = prompt('Nome da nova lista de desejos:', 'Minhas peças salvas');
    if (!nome) return;
    try {
      const response = await fetch(apiUrl('/api/listas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nome, tipo: 'simples' })
      });
      if (response.ok) {
        const novaLista = await response.json();
        setListas(prev => [...prev, novaLista]);
        setActiveListaId(novaLista.id);
        window.dispatchEvent(new Event('lastro:notifications-updated'));
      }
    } catch (err) {
      console.error('Erro ao criar lista:', err);
    }
  };

  const _handleSalvarPeca = async (pecaId, passportId) => {
    if (!activeListaId) {
      alert('Selecione ou crie uma lista primeiro.');
      return;
    }
    try {
      const response = await fetch(apiUrl('/api/listas/itens'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, listaId: activeListaId, pecaId, passportId })
      });
      if (response.ok) {
        alert('Peça salva na lista de desejos!');
        carregarListas();
        window.dispatchEvent(new Event('lastro:notifications-updated'));
      } else if (response.status === 409) {
        alert('Esta peça já está na lista de desejos.');
      } else {
        alert('Erro ao salvar peça.');
      }
    } catch (err) {
      console.error('Erro ao salvar peça:', err);
    }
  };

  const handleRemoverItem = async (itemId) => {
    if (!confirm('Remover este item da lista de desejos?')) return;
    try {
      const response = await fetch(apiUrl(`/api/listas/itens/${itemId}?userId=${userId}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        carregarListas();
      }
    } catch (err) {
      console.error('Erro ao remover item:', err);
    }
  };

  const activeLista = listas.find(l => l.id === activeListaId) || null;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-serif mb-2">Lista de Desejos</h1>
          <p className="text-gray-400 font-sans text-sm">
            Organize e acompanhe as peças de seu interesse no acervo da Lastro.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCriarLista}
            className="bg-[#A69076] text-black px-6 py-2.5 font-sans uppercase tracking-widest text-xs font-medium hover:bg-[#b8a287] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nova Lista
          </button>
          <Link
            to="/dashboard"
            className="border border-gray-700 text-gray-300 px-4 py-2.5 hover:border-white transition-colors text-xs font-sans uppercase tracking-wider flex items-center gap-2 rounded"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Suas Listas</h3>
          <div className="space-y-2">
            {listas.map((lista) => (
              <button
                key={lista.id}
                onClick={() => setActiveListaId(lista.id)}
                className={[
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-all border rounded-lg',
                  activeListaId === lista.id
                    ? 'bg-[#A69076]/10 border-[#A69076]/50 text-white'
                    : 'bg-[#111] border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'
                ].join(' ')}
              >
                <Heart className={`w-5 h-5 ${activeListaId === lista.id ? 'text-[#A69076]' : 'text-gray-600'}`} />
                <span className="text-sm font-sans">{lista.nome}</span>
                <span className="ml-auto text-[10px] text-gray-600 bg-gray-800 px-2 py-0.5 rounded">
                  {lista.itens?.length || 0}
                </span>
              </button>
            ))}
            {listas.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-xs font-sans">
                Nenhuma lista ainda. Crie a sua primeira lista.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-9">
          {!activeLista ? (
            <div className="text-center py-20 border border-dashed border-gray-800">
              <p className="text-gray-500 font-sans">Selecione uma lista ou crie uma nova.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-serif text-white">{activeLista.nome}</h2>
                <span className="text-xs uppercase tracking-widest text-gray-500 font-sans px-2 py-1 border border-gray-800 rounded">
                  {activeLista.itens?.length || 0} peça{activeLista.itens?.length !== 1 ? 's' : ''} salva{activeLista.itens?.length !== 1 ? 's' : ''}
                </span>
              </div>

              {activeLista.itens && activeLista.itens.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeLista.itens.map((item) => {
                    const peca = item.peca;
                    return (
                      <div key={item.id} className="bg-[#111] border border-gray-800 rounded-lg p-5 hover:border-gray-600 transition-colors">
                        {peca ? (
                          <>
                            <div className="aspect-[4/5] overflow-hidden bg-gray-900 rounded mb-4">
                              <img
                                src={peca.image || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=400&auto=format&fit=crop'}
                                alt={peca.name}
                                className="object-cover w-full h-full opacity-90"
                              />
                            </div>
                            <p className="text-gray-500 font-sans text-xs uppercase tracking-widest mb-1">{formatCat(peca.category)}</p>
                            <h3 className="font-serif text-gray-200 mb-2">{peca.name}</h3>
                            <p className="font-sans text-[#A69076] font-medium mb-4">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(peca.price || 0)}
                            </p>
                            <div className="flex items-center justify-between gap-2">
                              <Link
                                to={`/peca/${peca.id}`}
                                className="flex-1 bg-white text-black py-2.5 font-sans uppercase tracking-widest text-xs font-medium text-center hover:bg-gray-200 transition-colors"
                              >
                                Ver Detalhes da Peça
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoverItem(item.id);
                                }}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                title="Remover da lista"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <Heart className="w-8 h-8 text-gray-600 mb-2" />
                            <p className="text-gray-500 text-sm font-sans">Peça não disponível</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d] p-8">
                  <Heart className="w-12 h-12 text-gray-700 mb-4" />
                  <p className="text-gray-400 font-serif text-xl mb-2">Nenhuma peça salva ainda</p>
                  <p className="text-gray-600 font-sans text-xs mb-6">
                    Organize e acompanhe as peças de seu interesse no acervo da Lastro.
                  </p>
                  <Link
                    to="/catalogo"
                    className="inline-flex items-center gap-2 bg-[#A69076] text-black px-6 py-2.5 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" /> Explorar Catálogo
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;