import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  LogOut,
  Heart,
  Trash2,
  ChevronRight,
  ShieldCheck,
  FileText,
  QrCode,
  Star,
  Link2,
  X,
  Loader2,
  Bell,
} from 'lucide-react';
import { apiUrl } from '../api';

const formatPrice = (value) => {
  if (!value && value !== 0) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatStatus = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'UNDER_VALIDATION' || s === 'EM REVISÃO' || s === 'EM REVISAO' || s === 'PENDENTE' || s === 'EM ANÁLISE') {
    return 'Em análise';
  }
  if (s === 'APPROVED' || s === 'VERIFICADO' || s === 'VALIDO' || s === 'ATIVO' || s === 'DISPONÍVEL') {
    return 'Verificado';
  }
  return status || 'Em análise';
};

const formatCat = (c) => (/^watches$/i.test(String(c || '').trim()) ? 'Relógios' : c);

const ROLE_LABELS = {
  Comprador: 'Comprador / Colecionador',
  Proprietário: 'Proprietário',
  Vendedor: 'Vendedor Profissional',
  Perito: 'Perito Credenciado',
  EquipeLastro: 'Equipe Lastro',
  RepresentanteLoja: 'Representante da Loja',
  Loja: 'Loja / Curadoria',
  Admin: 'Administrador',
  Visitante: 'Visitante',
};

const IS_SELLER_ROLE = (role) => {
  const r = String(role || '').toLowerCase();
  return (
    r === 'vendedor' ||
    r === 'perito' ||
    r === 'equipelastro' ||
    r === 'representanteloja' ||
    r === 'loja' ||
    r === 'admin'
  );
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=400&auto=format&fit=crop';

const EmptyState = ({ icon: Icon, title, subtitle, action }) => (
  <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d] rounded-xl p-8">
    <Icon className="w-12 h-12 text-gray-700 mb-4 mx-auto" />
    <p className="text-gray-400 font-serif text-xl mb-2">{title}</p>
    <p className="text-gray-600 font-sans text-xs mb-6">{subtitle}</p>
    {action}
  </div>
);

const TOGGLE_TRACK =
  "w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]";

// ---------------------------------------------------------------------------
// Buyer Dashboard (Comprador / Proprietário)
// ---------------------------------------------------------------------------

const BuyerDashboard = ({ user, onLogout }) => {
  const [wishlists, setWishlists] = useState([]);
  const [ownedPieces, setOwnedPieces] = useState([]);
  const [prefs, setPrefs] = useState({
    alertasAtivos: false,
    lembretesAtivos: false,
    notificarPecasCompativeis: false,
    notificarLaudoConcluido: false,
    frequenciaLembrete: 'semestral',
    canalEmail: false,
    canalPush: true,
  });
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('userId') || 'anon_user';

  const loadWishlists = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/listas?userId=${userId}`));
      if (res.ok) {
        const data = await res.json();
        setWishlists(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar wishlists:', err);
    }
  }, [userId]);

  const loadOwnedPieces = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/pecas'));
      if (res.ok) {
        const data = await res.json();
        const all = Array.isArray(data) ? data : [];
        const owned = all.filter((p) => String(p.owner_id) === String(userId));
        setOwnedPieces(owned);
      }
    } catch (err) {
      console.error('Erro ao carregar peças do usuário:', err);
    }
  }, [userId]);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/notificacoes/preferencias?userId=${userId}`));
      if (res.ok) {
        const data = await res.json();
        setPrefs({
          alertasAtivos: data.alertasAtivos ?? false,
          lembretesAtivos: data.lembretesAtivos ?? false,
          notificarPecasCompativeis: data.notificarPecasCompativeis ?? false,
          notificarLaudoConcluido: data.notificarLaudoConcluido ?? false,
          frequenciaLembrete: data.frequenciaLembrete || 'semestral',
          canalEmail: data.canalEmail ?? false,
          canalPush: data.canalPush ?? true,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
    }
  }, [userId]);

  const savePrefs = async () => {
    try {
      const res = await fetch(apiUrl('/api/notificacoes/preferencias'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...prefs }),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
    }
  };

  const togglePref = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const removeFromWishlist = async (itemId) => {
    if (!window.confirm('Remover este item da sua lista de desejos?')) return;
    try {
      await fetch(apiUrl(`/api/listas/itens/${itemId}?userId=${userId}`), {
        method: 'DELETE',
      });
      loadWishlists();
    } catch (err) {
      console.error('Erro ao remover item:', err);
    }
  };

  // ---------------------------------------------------------------------------
  // Convite ao primeiro registro no acervo
  // ---------------------------------------------------------------------------
  const [firstInvestment, setFirstInvestment] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteProcessing, setInviteProcessing] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);

  const checkFirstInvestment = async () => {
    try {
      const res = await fetch(apiUrl(`/api/habito/primeiro-investimento/status?userId=${userId}`));
      if (res.ok) {
        const data = await res.json();
        setFirstInvestment(data);
      }
    } catch (err) {
      console.error('Erro ao verificar primeiro investimento:', err);
    }
  };

  const handleInviteResponse = async (aceito, acao) => {
    setInviteProcessing(true);
    try {
      const res = await fetch(apiUrl('/api/habito/convite-primeiro-investimento'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aceito,
          acao: aceito ? acao : undefined,
          pecaId: undefined,
          passportId: undefined,
          userId,
          anonymousId: undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao processar convite');
      setInviteResult({ aceito, message: data.message, acao });
      setInviteOpen(false);
      checkFirstInvestment();
    } catch (err) {
      setInviteResult({ aceito, message: err.message, error: true });
    } finally {
      setInviteProcessing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadWishlists(), loadOwnedPieces(), loadPrefs(), checkFirstInvestment()]).finally(() => setLoading(false));
  }, [loadWishlists, loadOwnedPieces, loadPrefs, checkFirstInvestment]);

  const allWishlistItems = wishlists.flatMap((l) =>
    (l.itens || []).map((i) => ({ ...i, listaNome: l.nome }))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-gray-800 pb-8">
        <div>
          <h1 className="text-4xl font-serif mb-2">Painel do Colecionador</h1>
          <p className="text-gray-400 font-sans text-sm">
            Bem-vindo de volta, <span className="text-white">{user.name}</span>
            {' · '}
            <span className="text-[#A69076] text-xs uppercase tracking-widest font-sans">
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </p>
        </div>
        <button
          onClick={onLogout}
          className="border border-gray-700 text-gray-300 px-4 py-2.5 hover:border-white transition-colors flex items-center gap-2"
          title="Sair"
        >
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>

      {/* Acesso Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link
          to="/categorias-rastreadas"
          className="bg-[#111] hover:bg-[#161616] border border-gray-800 hover:border-[#A69076]/60 p-4 rounded transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs uppercase tracking-widest text-[#A69076] font-sans font-semibold block">Monitoramento</span>
            <span className="text-sm font-serif text-white">Categorias de Interesse</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </Link>
        <Link
          to="/dashboard/nova-peca"
          className="bg-[#111] hover:bg-[#161616] border border-gray-800 hover:border-[#A69076]/60 p-4 rounded transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs uppercase tracking-widest text-[#A69076] font-sans font-semibold block">Curadoria</span>
            <span className="text-sm font-serif text-white">Submeter Nova Peça</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </Link>
        <Link
          to="/notificacoes"
          className="bg-[#111] hover:bg-[#161616] border border-gray-800 hover:border-[#A69076]/60 p-4 rounded transition-all flex items-center justify-between"
        >
          <div>
            <span className="text-xs uppercase tracking-widest text-[#A69076] font-sans font-semibold block">Alertas</span>
            <span className="text-sm font-serif text-white">Central de Notificações</span>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </Link>
      </div>

      {/* Convite ao primeiro registro */}
      {firstInvestment && !firstInvestment.primeiroInvestimentoFeito && inviteOpen === false && inviteResult === null && (
        <div className="mb-8 bg-[#111] border border-[#A69076]/30 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#A69076]/10 flex items-center justify-center text-[#A69076] shrink-0">
              <Star size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-serif text-white mb-1">Inicie sua coleção Lastro</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-4">
                Você ainda não fez seu primeiro investimento. Salve uma peça, crie uma lista de desejos ou registre sua própria peça para começar a construir seu acervo com passaportes digitais.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setInviteOpen(true); setInviteResult(null); }}
                  className="flex-1 bg-[#A69076] text-black px-4 py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors"
                >
                  Aceitar convite
                </button>
                <button
                  onClick={() => handleInviteResponse(false, 'dispensar')}
                  className="flex-1 border border-gray-700 text-gray-400 px-4 py-3 font-sans uppercase tracking-widest text-xs hover:border-gray-500 hover:text-white transition-colors"
                >
                  Dispensar por agora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de resposta ao convite */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#A69076]/40 rounded-xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Star size={20} className="text-[#A69076]" />
              <h2 className="text-xl font-serif text-white">Escolha sua ação inicial</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Qual será o primeiro passo na sua jornada de colecionador Lastro?
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleInviteResponse(true, 'salvar_peca')}
                disabled={inviteProcessing}
                className="w-full py-3 border border-[#2a2a2a] rounded-lg text-left text-xs font-sans uppercase tracking-widest text-gray-300 hover:border-[#A69076] hover:text-white transition-colors flex items-center gap-3"
              >
                <Heart className="w-4 h-4 shrink-0" />
                <span>Salvar uma peça na lista de desejos</span>
              </button>
              <button
                onClick={() => handleInviteResponse(true, 'criar_lista')}
                disabled={inviteProcessing}
                className="w-full py-3 border border-[#2a2a2a] rounded-lg text-left text-xs font-sans uppercase tracking-widest text-gray-300 hover:border-[#A69076] hover:text-white transition-colors flex items-center gap-3"
              >
                <Link2 className="w-4 h-4 shrink-0" />
                <span>Criar uma lista de desejos personalizada</span>
              </button>
              <button
                onClick={() => handleInviteResponse(true, 'registrar_peca_propria')}
                disabled={inviteProcessing}
                className="w-full py-3 border border-[#2a2a2a] rounded-lg text-left text-xs font-sans uppercase tracking-widest text-gray-300 hover:border-[#A69076] hover:text-white transition-colors flex items-center gap-3"
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Registrar sua própria peça à curadoria</span>
              </button>
              <button
                onClick={() => handleInviteResponse(false, 'dispensar')}
                disabled={inviteProcessing}
                className="w-full py-3 border border-gray-700 rounded-lg text-left text-xs font-sans uppercase tracking-widest text-gray-500 hover:border-gray-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4 shrink-0" />
                <span>Dispensar por agora</span>
              </button>
            </div>
            {inviteProcessing && (
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processando...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {inviteResult && (
        <div className="fixed top-24 right-4 z-50 max-w-sm">
          <div className={`p-4 rounded-lg text-xs font-sans uppercase tracking-widest shadow-xl ${
            inviteResult.error ? 'bg-red-900/40 border border-red-500/40 text-red-300' : 'bg-emerald-900/40 border border-emerald-500/40 text-emerald-300'
          }`}>
            <div className="font-bold mb-1">{inviteResult.aceito ? 'Convite aceito!' : 'Convite dispensado'}</div>
            <div>{inviteResult.message}</div>
            <button
              onClick={() => setInviteResult(null)}
              className="ml-2 text-[9px] hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Lista de desejos */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif text-white mb-1">Minha Lista de Desejos</h2>
            <p className="text-gray-500 font-sans text-xs">
              Peças que você salvou para acompanhar. O registro permanece seu e pode ser exportado a qualquer momento.
            </p>
          </div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-[#A69076] text-black px-5 py-2 font-sans uppercase tracking-widest text-xs font-medium hover:bg-[#b8a287] transition-colors"
          >
            <ChevronRight className="w-3 h-3" /> Explorar Catálogo
          </Link>
        </div>

        {allWishlistItems.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nenhuma peça salva ainda"
            subtitle="Salve peças do catálogo para acompanhar seu histórico e construir seu acervo pessoal."
            action={
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 bg-[#A69076] text-black px-6 py-2.5 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" /> Explorar Catálogo
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {allWishlistItems.map((item) => {
              const peca = item.peca;
              return (
                <div
                  key={item.id}
                  className="bg-[#111] border border-gray-800 rounded-lg p-5 hover:border-[#A69076]/50 transition-colors"
                >
                  {peca ? (
                    <>
                      <div className="aspect-[4/5] overflow-hidden bg-gray-900 rounded mb-4">
                        <img
                          src={peca.image || FALLBACK_IMAGE}
                          alt={peca.name}
                          className="object-cover w-full h-full opacity-90"
                        />
                      </div>
                      <p className="text-gray-500 font-sans text-xs uppercase tracking-widest mb-1">
                        {formatCat(peca.category)}
                      </p>
                      <h3 className="font-serif text-gray-200 mb-2">{peca.name}</h3>
                      <p className="font-sans text-[#A69076] font-medium mb-4">{formatPrice(peca.price)}</p>
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          to={`/peca/${peca.id}`}
                          className="flex-1 bg-white text-black py-2.5 font-sans uppercase tracking-widest text-xs font-medium text-center hover:bg-gray-200 transition-colors"
                        >
                          Ver Passaporte
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromWishlist(item.id);
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
                      <Heart className="w-8 h-8 text-gray-600 mb-2 mx-auto" />
                      <p className="text-gray-500 text-sm font-sans">Peça não disponível</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Peças do usuário */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif text-white mb-1">Minhas Peças</h2>
            <p className="text-gray-500 font-sans text-xs">
              Peças registradas em seu nome. Você é o proprietário e pode consultar o passaporte digital a qualquer momento.
            </p>
          </div>
        </div>

        {ownedPieces.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhuma peça registrada em seu nome"
            subtitle="Quando você adquirir ou registrar uma peça, ela aparecerá aqui com seu passaporte digital e histórico completo."
            action={null}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedPieces.map((peca) => (
              <div key={peca.id} className="bg-[#111] border border-gray-800 rounded-lg p-5">
                <div className="aspect-[4/5] overflow-hidden bg-gray-900 rounded mb-4">
                  <img
                    src={peca.image || FALLBACK_IMAGE}
                    alt={peca.name}
                    className="object-cover w-full h-full opacity-90"
                  />
                </div>
                <p className="text-gray-500 font-sans text-xs uppercase tracking-widest mb-1">
                  {formatCat(peca.category)}
                </p>
                <h3 className="font-serif text-gray-200 mb-2">{peca.name}</h3>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-gray-500">Status</span>
                    <span className="text-[#A69076] uppercase tracking-widest font-medium text-[10px]">
                      {formatStatus(peca.status)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-gray-500">ID do Passaporte</span>
                    <span className="text-gray-200 font-mono text-[10px]">{peca.passport_id}</span>
                  </div>
                </div>
                <Link
                  to={`/passaporte/${peca.share_token || peca.passport_id}?origem=dashboard_comprador`}
                  className="w-full bg-white text-black py-2.5 font-sans uppercase tracking-widest text-xs font-medium flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" /> Acessar Passaporte
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Preferências de notificação */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif text-white mb-1">Preferências de Notificação</h2>
            <p className="text-gray-500 font-sans text-xs">
              Escolha quais alertas deseja receber. O padrão é conservador: tudo desligado. Você pode ativar ou desativar com um toque.
            </p>
          </div>
        </div>

        <div className="bg-[#111] border border-gray-800 rounded-xl p-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-200 font-sans text-sm font-medium">Alertas ativos</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Receba alertas gerais sobre a curadoria e novidades do acervo.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.alertasAtivos}
                  onChange={() => togglePref('alertasAtivos')}
                  className="sr-only peer"
                />
                <div className={TOGGLE_TRACK}></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-200 font-sans text-sm font-medium">Lembretes de conservação</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Notificações periódicas sobre o estado de conservação de suas peças salvas.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.lembretesAtivos}
                  onChange={() => togglePref('lembretesAtivos')}
                  className="sr-only peer"
                />
                <div className={TOGGLE_TRACK}></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-200 font-sans text-sm font-medium">Peças compatíveis</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Avise quando uma nova peça da curadoria combinar com sua lista de desejos.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificarPecasCompativeis}
                  onChange={() => togglePref('notificarPecasCompativeis')}
                  className="sr-only peer"
                />
                <div className={TOGGLE_TRACK}></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-200 font-sans text-sm font-medium">Laudo concluído</h3>
                <p className="text-gray-500 text-xs mt-1">
                  Notifique quando o perito concluir o laudo de uma peça que você acompanha.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.notificarLaudoConcluido}
                  onChange={() => togglePref('notificarLaudoConcluido')}
                  className="sr-only peer"
                />
                <div className={TOGGLE_TRACK}></div>
              </label>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">
                Canais de recebimento
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-200 font-sans text-sm font-medium">E-mail</h3>
                    <p className="text-gray-500 text-xs mt-1">Receber alertas por e-mail</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.canalEmail}
                      onChange={() => togglePref('canalEmail')}
                      className="sr-only peer"
                    />
                    <div className={TOGGLE_TRACK}></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-200 font-sans text-sm font-medium">Push / navegador</h3>
                    <p className="text-gray-500 text-xs mt-1">Receber alertas no navegador</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.canalPush}
                      onChange={() => togglePref('canalPush')}
                      className="sr-only peer"
                    />
                    <div className={TOGGLE_TRACK}></div>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={savePrefs}
              className="w-full bg-[#A69076] text-black py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors mt-2"
            >
              Salvar Preferências
            </button>
          </div>
        </div>
      </section>

      <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest">
          Seus dados (listas de desejos, peças registradas e preferências) continuam sendo seus e podem ser exportados a qualquer momento.
        </p>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-sans">
          <ShieldCheck className="w-3 h-3 text-[#A69076]" />
          <span>Privacidade por padrão · Controle total dos seus registros</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Seller Dashboard (Vendedor / Perito / Equipe Lastro)
// ---------------------------------------------------------------------------

const SellerDashboard = ({ user, onLogout }) => {
  const [stats, setStats] = useState({
    ativas: 0,
    revisao: 0,
    vendidas: 0,
    pendentes: 0,
  });
  const [pieces, setPieces] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('userId') || 'anon_user';

  // Notificar peças compatíveis
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertProcessing, setAlertProcessing] = useState(false);
  const [alertResult, setAlertResult] = useState(null);
  const [alertTargetPeca, setAlertTargetPeca] = useState(null);
  const [alertForm, setAlertForm] = useState({
    userId: '',
    titulo: '',
    mensagem: '',
    acaoUrl: '',
  });

  const sendCompatibilityAlert = async (peca) => {
    setAlertTargetPeca(peca);
    setAlertForm({
      userId: '',
      titulo: `Nova peça compatível: ${peca.name}`,
      mensagem: `Uma nova peça da curadoria combina com seus interesses: ${peca.name}.`,
      acaoUrl: `/passaporte/${peca.share_token || peca.passport_id}?origem=alerta`,
    });
    setAlertOpen(true);
  };

  const handleSendAlert = async () => {
    setAlertProcessing(true);
    try {
      const res = await fetch(apiUrl('/api/habito/alerta-peca-compativel'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: alertForm.userId || undefined,
          pecaId: alertTargetPeca?.id || undefined,
          passportId: alertTargetPeca?.passport_id || undefined,
          titulo: alertForm.titulo || undefined,
          mensagem: alertForm.mensagem || undefined,
          acaoUrl: alertForm.acaoUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao enviar alerta');
      setAlertResult({ success: true, message: data.message || 'Alerta enviado com sucesso!' });
      setAlertOpen(false);
    } catch (err) {
      setAlertResult({ success: false, message: err.message || 'Erro ao enviar alerta de peça compatível' });
    } finally {
      setAlertProcessing(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/pecas'));
      if (res.ok) {
        const data = await res.json();
        const all = Array.isArray(data) ? data : [];
        const mine = all.filter((p) => String(p.owner_id) === String(userId));
        setPieces(mine);

        setStats({
          ativas: mine.filter((p) => {
            const st = String(p.status || '').toUpperCase();
            return st === 'APPROVED' || st === 'VERIFICADO' || st === 'ATIVO' || st === 'VALIDO';
          }).length,
          revisao: mine.filter((p) => {
            const st = String(p.status || '').toUpperCase();
            return st === 'UNDER_VALIDATION' || st === 'EM REVISÃO' || st === 'EM REVISAO' || st === 'EM ANÁLISE';
          }).length,
          vendidas: mine.filter((p) => {
            const st = String(p.status || '').toLowerCase();
            return st === 'vendido' || st === 'vendida';
          }).length,
          pendentes: mine.filter((p) => !p.status || String(p.status || '').toLowerCase() === 'pendente').length,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dados do vendedor:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-gray-800 pb-8">
        <div>
          <h1 className="text-4xl font-serif mb-2">Painel do Vendedor</h1>
          <p className="text-gray-400 font-sans text-sm">
            Bem-vindo de volta, <span className="text-white">{user.name}</span>
            {' · '}
            <span className="text-[#A69076] text-xs uppercase tracking-widest font-sans">
              {ROLE_LABELS[user.role] || user.role}
            </span>
          </p>
        </div>
        <div className="mt-6 md:mt-0 flex flex-wrap gap-3">
          <Link
            to="/admin/verificacao"
            className="bg-[#A69076] text-black px-5 py-2.5 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors flex items-center gap-2 rounded"
          >
            <ShieldCheck className="w-4 h-4" /> Painel de Curadoria
          </Link>
          <Link
            to="/dashboard/nova-peca"
            className="bg-white text-black px-5 py-2.5 font-sans uppercase tracking-widest text-xs font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 rounded"
          >
            <Plus className="w-4 h-4" /> Nova Peça
          </Link>
          <button
            onClick={onLogout}
            className="border border-gray-700 text-gray-300 px-4 py-2.5 hover:border-white transition-colors flex items-center gap-2 rounded"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#111] border border-gray-800 p-6">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Peças Verificadas</h3>
          <p className="text-4xl font-serif text-white">{stats.ativas}</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Em Análise</h3>
          <p className="text-4xl font-serif text-white">{stats.revisao}</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Vendas Concluídas</h3>
          <p className="text-4xl font-serif text-white">{stats.vendidas}</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Pendências</h3>
          <p className="text-4xl font-serif text-[#A69076]">{stats.pendentes}</p>
        </div>
      </div>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif text-white">Seu Estoque de Passaportes</h2>
          <Link
            to="/dashboard/nova-peca"
            className="text-[#A69076] text-xs uppercase tracking-widest font-sans hover:text-white transition-colors"
          >
            + Cadastrar nova peça <span aria-hidden="true">→</span>
          </Link>
        </div>

        {pieces.length === 0 ? (
          <EmptyState
            icon={Plus}
            title="Nenhuma peça cadastrada ainda."
            subtitle="Registre suas peças para começar a gerenciar estoque, gerar links de origem e acompanhar o status de cada passaporte."
            action={
              <Link
                to="/dashboard/nova-peca"
                className="inline-flex items-center gap-2 bg-[#A69076] text-black px-6 py-2.5 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Cadastrar Primeira Peça
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="pb-4 text-gray-400 uppercase tracking-widest text-xs font-sans">Peça</th>
                  <th className="pb-4 text-gray-400 uppercase tracking-widest text-xs font-sans">Categoria</th>
                  <th className="pb-4 text-gray-400 uppercase tracking-widest text-xs font-sans">Status</th>
                  <th className="pb-4 text-gray-400 uppercase tracking-widest text-xs font-sans">Conservação</th>
                  <th className="pb-4 text-gray-400 uppercase tracking-widest text-xs font-sans text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pieces.map((peca) => (
                  <tr key={peca.id} className="border-b border-gray-900 bg-[#0a0a0a]/50 hover:bg-[#111]/70 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={peca.image || FALLBACK_IMAGE}
                          alt={peca.name}
                          className="w-12 h-12 object-cover rounded bg-gray-900"
                        />
                        <div>
                          <h4 className="font-serif text-gray-200 text-sm">{peca.name}</h4>
                          <p className="text-gray-500 font-mono text-[10px]">{peca.passport_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-gray-400 font-sans text-sm">{formatCat(peca.category)}</td>
                    <td className="py-4">
                      <span
                        className={`px-2 py-1 rounded text-[10px] font-sans uppercase ${
                          formatStatus(peca.status) === 'Verificado'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : formatStatus(peca.status) === 'Em análise'
                            ? 'bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/30'
                            : 'bg-gray-700/20 text-gray-500 border border-gray-700/30'
                        }`}
                      >
                        {formatStatus(peca.status)}
                      </span>
                    </td>
                    <td className="py-4 text-gray-400 font-sans text-xs">
                      {peca.conservation_state || 'Não informado'}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/passaporte/${peca.share_token || peca.passport_id}?origem=link_vendedor`}
                          className="text-gray-400 hover:text-[#A69076] transition-colors p-1"
                          title="Ver passaporte"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <button
                          className="text-gray-400 hover:text-[#A69076] transition-colors p-1"
                          title="Gerar QR Code com origem"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => sendCompatibilityAlert(peca)}
                          className="text-[#A69076] hover:text-[#b8a287] transition-colors p-1"
                          title="Notificar peças compatíveis"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de notificação de peça compatível */}
      {alertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-[#A69076]/40 rounded-xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-2 mb-6">
              <Bell size={20} className="text-[#A69076]" />
              <h2 className="text-xl font-serif text-white">Notificar Peça Compatível</h2>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              Envie uma notificação de compatibilidade para um usuário sobre "{alertTargetPeca?.name}".
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleSendAlert(); }} className="space-y-4">
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">ID do Usuário Destinatário *</label>
                <input
                  type="text"
                  required
                  value={alertForm.userId}
                  onChange={(e) => setAlertForm({ ...alertForm, userId: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
                  placeholder="ID do usuário"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Título</label>
                <input
                  type="text"
                  value={alertForm.titulo}
                  onChange={(e) => setAlertForm({ ...alertForm, titulo: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Mensagem</label>
                <textarea
                  value={alertForm.mensagem}
                  onChange={(e) => setAlertForm({ ...alertForm, mensagem: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">URL de Ação</label>
                <input
                  type="text"
                  value={alertForm.acaoUrl}
                  onChange={(e) => setAlertForm({ ...alertForm, acaoUrl: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={alertProcessing}
                  className="flex-1 bg-[#A69076] text-black px-6 py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors disabled:opacity-50"
                >
                  {alertProcessing ? 'Enviando...' : 'Enviar Notificação'}
                </button>
                <button
                  type="button"
                  onClick={() => setAlertOpen(false)}
                  className="flex-1 border border-gray-700 text-gray-300 px-6 py-3 font-sans uppercase tracking-widest text-xs hover:border-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alertResult && (
        <div className="fixed top-24 right-4 z-50 max-w-sm">
          <div className={`p-4 rounded-lg text-xs font-sans uppercase tracking-widest shadow-xl ${
            alertResult.success ? 'bg-emerald-900/40 border border-emerald-500/40 text-emerald-300' : 'bg-red-900/40 border border-red-500/40 text-red-300'
          }`}>
            <div className="font-bold mb-1">{alertResult.success ? 'Notificação enviada!' : 'Erro ao enviar notificação'}</div>
            <div>{alertResult.message}</div>
            <button
              onClick={() => setAlertResult(null)}
              className="ml-2 text-[9px] hover:underline"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest">
          Painel operacional orientado à gestão de objetos. Rastreie cada passaporte, cada pendência e cada interação.
        </p>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 font-sans">
          <ShieldCheck className="w-3 h-3 text-[#A69076]" />
          <span>Rastreamento completo de origem e histórico</span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Dashboard (role-aware router)
// ---------------------------------------------------------------------------

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    navigate('/');
  };

  if (!user) return null;

  if (IS_SELLER_ROLE(user.role)) {
    return <SellerDashboard user={user} onLogout={handleLogout} />;
  }

  return <BuyerDashboard user={user} onLogout={handleLogout} />;
};

export default Dashboard;