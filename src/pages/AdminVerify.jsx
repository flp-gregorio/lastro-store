import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { apiUrl } from '../api';

const formatCat = (c) => (/^watches$/i.test(String(c || '').trim()) ? 'Relógios' : c);

const AdminVerify = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }
    carregarPecas();
  }, []);

  const carregarPecas = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl('/api/pecas'));
      if (response.ok) {
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao listar peças:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item) => {
    setApprovingId(item.id);
    setFeedback(null);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') || currentUser?.role || 'EquipeLastro';
    const userId = localStorage.getItem('userId') || currentUser?.id || 'curador_lastro';

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-user-role': userRole,
        'x-user-id': userId
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl(`/api/pecas/${item.id}/status`), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: 'APPROVED',
          expertName: 'Curadoria Lastro'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setFeedback({
          type: 'success',
          text: `A peça "${item.name}" foi verificada e homologada com sucesso! As notificações foram enviadas aos colecionadores interessados.`
        });
        await carregarPecas();
      } else {
        setFeedback({
          type: 'error',
          text: data.message || 'Falha ao aprovar peça. Verifique as permissões de acesso.'
        });
      }
    } catch (err) {
      console.error('Erro ao aprovar peça:', err);
      setFeedback({ type: 'error', text: 'Erro de comunicação ao conectar com o servidor.' });
    } finally {
      setApprovingId(null);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const pendingItems = items.filter((item) => {
    const s = String(item.status || '').toUpperCase();
    return s === 'UNDER_VALIDATION' || s === 'EM REVISÃO' || s === 'EM REVISAO' || s === 'PENDENTE' || s === 'EM ANÁLISE';
  });

  const approvedItems = items.filter((item) => {
    const s = String(item.status || '').toUpperCase();
    return s === 'APPROVED' || s === 'VERIFICADO' || s === 'DISPONÍVEL' || s === 'VALIDO';
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-800 pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/40">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <span className="text-[10px] uppercase tracking-widest font-sans font-medium text-[#A69076]">
                Painel de Curadoria e Homologação
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
              Verificação de Peças
            </h1>
            <p className="text-gray-400 font-sans text-sm mt-2 max-w-2xl">
              Área dedicada à representação da loja e peritos credenciados da Lastro para inspeção de dossiês e homologação técnica.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={carregarPecas}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 text-xs uppercase tracking-wider font-sans hover:border-[#A69076] transition-colors rounded"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar Lista
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded mb-8 text-xs font-sans uppercase tracking-widest flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                : 'bg-red-950/60 border border-red-500/50 text-red-300'
            }`}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-[#111] border border-gray-800 p-5 rounded-sm">
            <span className="text-xs uppercase tracking-widest font-sans text-gray-500">Peças em Análise</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-serif text-amber-400">{pendingItems.length}</span>
              <span className="text-[10px] font-sans uppercase tracking-wider text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                Aguardando Laudo
              </span>
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 p-5 rounded-sm">
            <span className="text-xs uppercase tracking-widest font-sans text-gray-500">Peças Verificadas</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-3xl font-serif text-emerald-400">{approvedItems.length}</span>
              <span className="text-[10px] font-sans uppercase tracking-wider text-emerald-400/80 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
                Passaporte Ativo
              </span>
            </div>
          </div>

          <div className="bg-[#111] border border-gray-800 p-5 rounded-sm">
            <span className="text-xs uppercase tracking-widest font-sans text-gray-500">Operador Atual</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-sm font-sans text-white truncate">{currentUser?.name || 'Representante da Loja'}</span>
              <span className="text-[10px] font-sans uppercase tracking-wider text-[#A69076] bg-[#A69076]/10 px-2 py-0.5 rounded border border-[#A69076]/30">
                {currentUser?.role === 'EquipeLastro' ? 'Curadoria Lastro' : currentUser?.role || 'Curadoria Lastro'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Pending Products */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl md:text-2xl font-serif text-white">Peças Aguardando Verificação</h2>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center items-center bg-[#111] border border-gray-800 rounded">
              <Loader2 className="w-8 h-8 animate-spin text-[#A69076]" />
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-gray-800 rounded bg-[#111] p-8">
              <CheckCircle className="w-10 h-10 text-emerald-500/60 mx-auto mb-3" />
              <p className="text-gray-300 font-serif text-lg mb-1">Nenhuma peça em análise no momento</p>
              <p className="text-gray-500 font-sans text-xs">
                Todas as submissões recentes foram verificadas e homologadas pela curadoria.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#111] border border-gray-800 hover:border-[#A69076]/60 p-6 rounded transition-all"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Image Preview */}
                    <div className="w-full md:w-48 h-48 bg-[#0a0a0a] rounded overflow-hidden flex-shrink-0 border border-gray-800">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Information */}
                    <div className="flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <span className="text-xs uppercase tracking-widest font-sans text-[#A69076]">
                            {formatCat(item.category)}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest font-sans font-bold px-2.5 py-1 rounded border bg-amber-500/20 text-amber-300 border-amber-500/40">
                            Em análise
                          </span>
                        </div>

                        <h3 className="text-2xl font-serif text-white mb-2">{item.name}</h3>
                        <p className="text-lg font-sans text-gray-200 mb-3">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </p>
                        <p className="text-xs text-gray-400 font-sans line-clamp-2 mb-4">
                          {item.description || 'Sem descrição informada pelo solicitante.'}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] font-sans text-gray-400 mb-4 bg-[#0a0a0a] p-3 rounded border border-gray-800/80">
                          <div>
                            <span className="text-gray-500 block uppercase tracking-wider text-[9px]">ID Passaporte</span>
                            <span className="text-white font-mono">{item.passportId || 'LST-PENDENTE'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block uppercase tracking-wider text-[9px]">Procedência</span>
                            <span className="text-white truncate block">{item.provenance || 'Não informado'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block uppercase tracking-wider text-[9px]">Conservação</span>
                            <span className="text-white">{item.conservationState || 'Excelente'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-800/80">
                        <button
                          onClick={() => handleApprove(item)}
                          disabled={approvingId === item.id}
                          className="bg-[#A69076] hover:bg-[#b8a287] text-black px-6 py-2.5 font-sans uppercase tracking-widest text-xs font-semibold rounded flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {approvingId === item.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" /> Verificando...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" /> Verificar e Homologar Peça
                            </>
                          )}
                        </button>

                        <Link
                          to={`/peca/${item.id}`}
                          className="border border-gray-700 hover:border-white text-gray-300 hover:text-white px-4 py-2.5 font-sans uppercase tracking-widest text-xs rounded transition-colors flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Ver Detalhes da Peça
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Approved Products */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl md:text-2xl font-serif text-white">Peças Verificadas Recentemente</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedItems.slice(0, 6).map((item) => (
              <div key={item.id} className="bg-[#111] border border-gray-800 rounded p-4 flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[4/3] bg-black rounded overflow-hidden mb-3">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 text-[9px] uppercase tracking-widest font-sans font-medium px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                      Verificado
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-sans text-gray-500">{formatCat(item.category)}</span>
                  <h4 className="font-serif text-white text-lg mt-0.5 truncate">{item.name}</h4>
                  <p className="font-sans text-sm text-gray-300">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs font-sans text-gray-400">
                  <span className="font-mono text-[10px]">{item.passportId}</span>
                  <Link to={`/peca/${item.id}`} className="text-[#A69076] hover:underline flex items-center gap-1">
                    Ver <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVerify;
