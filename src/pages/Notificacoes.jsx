import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BellOff,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Clock,
  CheckCheck,
  Send
} from 'lucide-react';
import { apiUrl, getCurrentUserId } from '../api';

const TIPO_LABELS = {
  primeiro_investimento: 'Acompanhamento de Acervo',
  'peca_compatível': 'Peça Compatível · Curadoria',
  laudo_concluido: 'Laudo Concluído · Perícia',
  lembrete_conservacao: 'Lembrete de Conservação',
  alerta_generico: 'Alerta da Plataforma'
};

const Notificacoes = () => {
  const [preferencias, setPreferencias] = useState({
    alertasAtivos: false,
    lembretesAtivos: false,
    notificarPecasCompativeis: false,
    notificarLaudoConcluido: false,
    frequenciaLembrete: 'semestral',
    canalEmail: false,
    canalPush: true
  });
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const userId = getCurrentUserId();

  const carregarPreferencias = useCallback(async () => {
    try {
      const response = await fetch(apiUrl(`/api/notificacoes/preferencias?userId=${encodeURIComponent(userId)}`));
      if (response.ok) {
        const data = await response.json();
        setPreferencias((prev) => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Erro ao carregar preferências:', err);
    }
  }, [userId]);

  const carregarNotificacoes = useCallback(async () => {
    try {
      const response = await fetch(apiUrl(`/api/notificacoes?userId=${encodeURIComponent(userId)}&limit=50`));
      if (response.ok) {
        const data = await response.json();
        setNotificacoes(Array.isArray(data) ? data : []);
        window.dispatchEvent(new Event('lastro:notifications-updated'));
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    carregarPreferencias();
    carregarNotificacoes();
  }, [carregarPreferencias, carregarNotificacoes]);

  const handleAtualizarPreferencias = async () => {
    setSavingPrefs(true);
    setFeedback(null);
    try {
      const response = await fetch(apiUrl('/api/notificacoes/preferencias'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...preferencias })
      });
      if (response.ok) {
        const saved = await response.json();
        setPreferencias((prev) => ({ ...prev, ...saved }));
        setFeedback({
          type: 'success',
          text: 'Preferências salvas com sucesso!'
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        setFeedback({
          type: 'error',
          text: errData.message || 'Erro ao atualizar preferências.'
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar preferências:', err);
      setFeedback({ type: 'error', text: 'Falha de conexão ao salvar preferências.' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleMarcarLida = async (id) => {
    try {
      await fetch(apiUrl(`/api/notificacoes/${id}/ler?userId=${encodeURIComponent(userId)}`), {
        method: 'PATCH'
      });
      carregarNotificacoes();
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await fetch(apiUrl(`/api/notificacoes/ler-todas?userId=${encodeURIComponent(userId)}`), {
        method: 'PATCH'
      });
      carregarNotificacoes();
    } catch (err) {
      console.error('Erro ao marcar todas como lidas:', err);
    }
  };

  const handleSimularGatilho = async (tipoGatilho) => {
    setFeedback(null);
    try {
      await fetch(apiUrl('/api/notificacoes/preferencias'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...preferencias })
      });

      let endpoint = '/api/notificacoes';
      let payload = {};

      if (tipoGatilho === 'peca_compativel') {
        endpoint = '/api/habito/alerta-peca-compativel';
        payload = { userId };
      } else if (tipoGatilho === 'laudo_concluido') {
        endpoint = '/api/habito/aviso-laudo-concluido';
        payload = {
          usuarioId: userId,
          tipo: 'dono'
        };
      } else if (tipoGatilho === 'lembrete_conservacao') {
        endpoint = '/api/habito/lembrete-conservacao';
        payload = {
          userId,
          frequencia: preferencias.frequenciaLembrete || 'semestral'
        };
      }

      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.enviado === false || data.blockedByPreferences) {
        setFeedback({
          type: 'warning',
          text:
            data.message ||
            'Envio bloqueado pelas suas preferências: ative a opção correspondente ao lado para receber este tipo de notificação.'
        });
      } else {
        setFeedback({
          type: 'success',
          text: 'Notificação recebida! Clique em "Abrir Passaporte" no card abaixo para consultar a peça.'
        });
        carregarNotificacoes();
      }
    } catch (err) {
      console.error('Erro ao testar gatilho:', err);
      setFeedback({ type: 'error', text: 'Erro ao disparar notificação.' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]"></div>
      </div>
    );
  }

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-serif mb-2 text-white">Notificações</h1>
          <p className="text-gray-400 font-sans text-sm">
            Gerencie seus alertas e lembretes. Nenhum alerta ou lembrete é enviado sem sua permissão explícita.
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarcarTodasLidas}
            className="inline-flex items-center gap-2 border border-gray-700 hover:border-[#A69076] text-gray-300 hover:text-[#A69076] px-4 py-2 text-xs uppercase tracking-widest font-sans transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas ({unreadCount})
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={[
            'mb-8 p-4 border rounded flex items-start justify-between gap-4 font-sans text-xs',
            feedback.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
              : feedback.type === 'warning'
                ? 'bg-amber-950/30 border-amber-700/50 text-amber-300'
                : 'bg-red-950/30 border-red-700/50 text-red-300'
          ].join(' ')}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-white uppercase tracking-widest text-[10px] shrink-0 cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Esquerda: Preferências + Simulador */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-6">
              Preferências de Notificação
            </h3>

            <div className="space-y-4">
              {/* Toggle 1: Alertas Ativos */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Alertas ativos</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Habilita o recebimento de alertas da curadoria
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.alertasAtivos}
                    onChange={(e) =>
                      setPreferencias({ ...preferencias, alertasAtivos: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>

              {/* Toggle 2: Lembretes Ativos */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Lembretes ativos</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Lembretes periódicos de conservação de peças
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.lembretesAtivos}
                    onChange={(e) =>
                      setPreferencias({ ...preferencias, lembretesAtivos: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>

              {/* Toggle 3: Peças Compatíveis */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Peças compatíveis</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Avisar quando peça nova combinar com sua Lista de Desejos
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.notificarPecasCompativeis}
                    onChange={(e) =>
                      setPreferencias({
                        ...preferencias,
                        notificarPecasCompativeis: e.target.checked,
                        alertasAtivos: e.target.checked ? true : preferencias.alertasAtivos
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>

              {/* Toggle 4: Laudo Concluído */}
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Laudo concluído</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Aviso quando o perito assina o laudo e emite o Passaporte
                  </p>
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

              {/* Seletor de Frequência Padrão */}
              <div className="p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-sans mb-2">
                  Frequência padrão de lembretes
                </label>
                <select
                  value={preferencias.frequenciaLembrete}
                  onChange={(e) =>
                    setPreferencias({ ...preferencias, frequenciaLembrete: e.target.value })
                  }
                  className="w-full bg-[#111] border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#A69076] font-sans"
                >
                  <option value="mensal">Mensal</option>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>

              <button
                onClick={handleAtualizarPreferencias}
                disabled={savingPrefs}
                className="w-full bg-[#A69076] text-black py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingPrefs ? 'Salvando...' : 'Salvar Preferências'}
              </button>
            </div>
          </div>

          {/* Painel para testar os alertas e lembretes */}
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <Send className="w-4 h-4 text-[#A69076]" />
              <h3 className="text-gray-300 uppercase tracking-widest text-xs font-sans">
                Testar Alertas e Lembretes
              </h3>
            </div>
            <p className="text-xs text-gray-500 font-sans mb-4 leading-relaxed">
              Teste o recebimento de avisos conforme as preferências selecionadas acima. Se a opção estiver desativada, o envio não será realizado.
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => handleSimularGatilho('peca_compativel')}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0a0a0a] border border-gray-800 hover:border-[#A69076] text-left text-xs font-sans text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#A69076]" />
                  Simular Alerta de Peça Compatível
                </span>
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Disparar</span>
              </button>

              <button
                onClick={() => handleSimularGatilho('laudo_concluido')}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0a0a0a] border border-gray-800 hover:border-[#A69076] text-left text-xs font-sans text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Simular Aviso de Laudo Concluído
                </span>
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Disparar</span>
              </button>

              <button
                onClick={() => handleSimularGatilho('lembrete_conservacao')}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#0a0a0a] border border-gray-800 hover:border-[#A69076] text-left text-xs font-sans text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  Simular Lembrete de Conservação
                </span>
                <span className="text-[10px] uppercase tracking-widest text-gray-500">Disparar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Caixa de Entrada de Notificações */}
        <div className="lg:col-span-7">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-6">
            Suas Notificações ({notificacoes.length})
          </h3>

          {notificacoes.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d] p-8 flex flex-col items-center">
              <BellOff className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-400 font-serif text-xl mb-2">Nenhuma notificação recebida</p>
              <p className="text-gray-500 font-sans text-xs max-w-md leading-relaxed">
                Salve uma peça na Lista de Desejos ou ative os alertas ao lado e clique em "Salvar Preferências" para receber avisos da curadoria.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificacoes.map((notif) => {
                const targetUrl =
                  notif.acao_url ||
                  (notif.passport_id ? `/passaporte/${notif.passport_id}?origem=alerta` : null);

                return (
                  <div
                    key={notif.id}
                    className={[
                      'bg-[#111] border rounded-lg p-5 transition-colors',
                      notif.lida ? 'border-gray-800/80 opacity-80' : 'border-[#A69076]/50'
                    ].join(' ')}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={[
                            'text-[10px] uppercase tracking-widest font-sans font-medium px-2 py-0.5 rounded',
                            notif.lida
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/40'
                          ].join(' ')}
                        >
                          {notif.lida ? 'Lida' : 'Nova'}
                        </span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-500 font-sans">
                          {TIPO_LABELS[notif.tipo] || notif.tipo}
                        </span>
                      </div>
                      {notif.lida ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#A69076] shrink-0" />
                      )}
                    </div>

                    <h4 className="font-serif text-lg text-gray-100 mb-1">{notif.titulo}</h4>
                    <p className="text-xs text-gray-400 font-sans leading-relaxed mb-4">
                      {notif.mensagem}
                    </p>

                    <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-gray-800/70">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {notif.criado_em
                          ? new Date(notif.criado_em).toLocaleString('pt-BR')
                          : 'Agora'}
                      </span>

                      <div className="flex items-center gap-4">
                        {!notif.lida && (
                          <button
                            onClick={() => handleMarcarLida(notif.id)}
                            className="text-xs text-gray-400 hover:text-white underline font-sans cursor-pointer"
                          >
                            Marcar como lida
                          </button>
                        )}

                        {targetUrl && (
                          <Link
                            to={targetUrl}
                            onClick={() => {
                              if (!notif.lida) handleMarcarLida(notif.id);
                            }}
                            className="inline-flex items-center gap-1.5 bg-[#A69076] text-black px-3 py-1.5 text-[10px] uppercase tracking-widest font-sans font-semibold hover:bg-[#b8a287] transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Abrir Passaporte
                          </Link>
                        )}
                      </div>
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
