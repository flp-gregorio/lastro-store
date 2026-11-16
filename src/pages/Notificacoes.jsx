import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Clock,
  ShieldCheck,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { apiUrl } from '../api';

const Notificacoes = () => {
  const [preferencias, setPreferencias] = useState({
    alertasAtivos: true,
    lembretesAtivos: false,
    notificarPecasCompativeis: true,
    notificarLaudoConcluido: true,
    frequenciaLembrete: 'semestral',
    canalEmail: false,
    canalPush: true
  });
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = localStorage.getItem('userId') || 'guest_user';

  useEffect(() => {
    carregarPreferencias();
    carregarNotificacoes();
  }, [userId]);

  const carregarPreferencias = async () => {
    try {
      const response = await fetch(apiUrl(`/api/notificacoes/preferencias?userId=${userId}`));
      if (response.ok) {
        const data = await response.json();
        setPreferencias(data);
      }
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
    }
  };

  const carregarNotificacoes = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(apiUrl(`/api/notificacoes?userId=${userId}&limit=50`));
      if (response.ok) {
        const data = await response.json();
        setNotificacoes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAtualizarPreferencias = async () => {
    try {
      const response = await fetch(apiUrl('/api/notificacoes/preferencias'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...preferencias })
      });
      if (response.ok) {
        alert('Preferências salvas com sucesso!');
      } else {
        alert('Erro ao atualizar preferências.');
      }
    } catch (err) {
      console.error('Erro ao atualizar preferências:', err);
    }
  };

  const handleMarcarLida = async (id) => {
    try {
      await fetch(apiUrl(`/api/notificacoes/${id}/ler?userId=${userId}`), {
        method: 'PATCH'
      });
      carregarNotificacoes();
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen bg-[#0a0a0a] text-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/40">
              <Bell className="w-4 h-4" />
            </span>
            <span className="text-[10px] uppercase tracking-widest font-sans font-medium text-[#A69076]">
              Central de Alertas e Notificações (Person B)
            </span>
          </div>
          <h1 className="text-4xl font-serif text-white">Notificações</h1>
          <p className="text-gray-400 font-sans text-sm mt-1">
            Acompanhe atualizações de peças em curadoria, laudos concluídos e alertas de categorias rastreadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/categorias-rastreadas"
            className="px-4 py-2 bg-[#A69076]/15 hover:bg-[#A69076]/25 border border-[#A69076]/50 text-[#A69076] text-xs uppercase tracking-widest font-sans transition-colors rounded"
          >
            Categorias Rastreadas
          </Link>
          <button
            onClick={carregarNotificacoes}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-white text-xs uppercase tracking-wider font-sans transition-colors rounded"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Preferences */}
        <div className="lg:col-span-4">
          <div className="bg-[#111] border border-gray-800 rounded p-6 sticky top-28">
            <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-6">
              Preferências de Alerta
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Alertas ativos</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Receba alertas da curadoria</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.alertasAtivos}
                    onChange={(e) => setPreferencias({ ...preferencias, alertasAtivos: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Peças sob validação</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Alertas de categorias rastreadas</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.notificarPecasCompativeis}
                    onChange={(e) =>
                      setPreferencias({ ...preferencias, notificarPecasCompativeis: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Laudo concluído</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Aviso quando o perito homologa a peça</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.notificarLaudoConcluido}
                    onChange={(e) =>
                      setPreferencias({ ...preferencias, notificarLaudoConcluido: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>

              <button
                onClick={handleAtualizarPreferencias}
                className="w-full bg-[#A69076] text-black py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors rounded"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Notification List */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans">
              Notificações Recebidas ({notificacoes.length})
            </h3>
            {notificacoes.length > 0 && (
              <span className="text-[10px] text-gray-500 font-sans">
                Clique na notificação ou no botão para abrir a peça correspondente.
              </span>
            )}
          </div>

          {notificacoes.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d] p-8 rounded">
              <BellOff className="w-12 h-12 text-gray-700 mb-4 mx-auto" />
              <p className="text-gray-400 font-serif text-xl mb-2">Nenhuma notificação encontrada</p>
              <p className="text-gray-600 font-sans text-xs max-w-sm mx-auto mb-6">
                Rastreie a categoria "Watches" na página de rastreamento para receber notificações instantâneas quando novas peças forem enviadas.
              </p>
              <Link
                to="/categorias-rastreadas"
                className="inline-block bg-[#A69076] text-black px-6 py-2.5 font-sans uppercase tracking-widest text-xs font-semibold rounded hover:bg-[#b8a287] transition-colors"
              >
                Rastrear Categorias
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {notificacoes.map((notif) => {
                const isUnderValidationNotif =
                  notif.tipo === 'peca_pendente' ||
                  notif.titulo?.toLowerCase().includes('validação') ||
                  notif.mensagem?.toLowerCase().includes('validação');

                const isApprovedNotif =
                  notif.tipo === 'peca_aprovada' ||
                  notif.titulo?.toLowerCase().includes('verificada') ||
                  notif.titulo?.toLowerCase().includes('aprovad');

                const targetUrl = notif.acao_url || (notif.peca_id ? `/peca/${notif.peca_id}` : '/catalogo');

                return (
                  <div
                    key={notif.id}
                    className={`bg-[#111] border rounded p-5 transition-all ${
                      isApprovedNotif
                        ? 'border-emerald-500/40 hover:border-emerald-500/70'
                        : isUnderValidationNotif
                        ? 'border-amber-500/40 hover:border-amber-500/70'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        {isApprovedNotif ? (
                          <span className="text-[10px] uppercase tracking-widest font-sans font-bold px-2 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/40 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            ITEM APROVADO
                          </span>
                        ) : isUnderValidationNotif ? (
                          <span className="text-[10px] uppercase tracking-widest font-sans font-bold px-2 py-0.5 rounded border bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            SOB VALIDAÇÃO
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-widest font-sans px-2 py-0.5 rounded border bg-gray-800 text-gray-300 border-gray-700">
                            {notif.tipo}
                          </span>
                        )}

                        <span
                          className={`text-[9px] uppercase tracking-widest font-sans px-2 py-0.5 rounded ${
                            notif.lida
                              ? 'bg-gray-800/60 text-gray-500'
                              : 'bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/40'
                          }`}
                        >
                          {notif.lida ? 'Lida' : 'Nova'}
                        </span>
                      </div>

                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(notif.criado_em).toLocaleDateString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <h4 className="font-serif text-white text-lg mb-1">{notif.titulo}</h4>
                    <p className="text-xs text-gray-300 font-sans mb-4 leading-relaxed">{notif.mensagem}</p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800/80">
                      <Link
                        to={targetUrl}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-sans uppercase tracking-widest font-semibold transition-colors ${
                          isApprovedNotif
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-[#A69076] hover:bg-[#b8a287] text-black'
                        }`}
                      >
                        {isApprovedNotif ? 'Ver Peça Aprovada' : 'Ver Peça'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {!notif.lida && (
                        <button
                          onClick={() => handleMarcarLida(notif.id)}
                          className="text-xs text-gray-400 hover:text-white font-sans underline"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notificacoes;
