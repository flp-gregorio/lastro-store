import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { apiUrl } from '../api';

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

  const userId = localStorage.getItem('userId') || 'anon_user';

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
        alert('Preferências atualizadas com sucesso!');
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-serif mb-2">Notificações</h1>
          <p className="text-gray-400 font-sans text-sm">
            Gerencie alertas e lembretes. O padrão inicial é conservador (tudo desligado).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-6">Preferências</h3>
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
                    onChange={e => setPreferencias({ ...preferencias, alertasAtivos: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Lembretes ativos</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Lembretes de conservação de peças</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.lembretesAtivos}
                    onChange={e => setPreferencias({ ...preferencias, lembretesAtivos: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Peças compatíveis</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Alertas de nova curadoria para sua lista</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.notificarPecasCompativeis}
                    onChange={e => setPreferencias({ ...preferencias, notificarPecasCompativeis: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded">
                <div>
                  <p className="font-sans text-sm text-gray-200 font-medium">Laudo concluído</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest">Aviso quando o perito conclui o laudo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferencias.notificarLaudoConcluido}
                    onChange={e => setPreferencias({ ...preferencias, notificarLaudoConcluido: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#A69076]"></div>
                </label>
              </div>
              <button
                onClick={handleAtualizarPreferencias}
                className="w-full bg-[#A69076] text-black py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-6">Suas Notificações</h3>

          {notificacoes.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d] p-8">
              <BellOff className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-400 font-serif text-xl mb-2">Nenhuma notificação</p>
              <p className="text-gray-600 font-sans text-xs">Ative alertas para receber notificações da Lastro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificacoes.map((notif) => (
                <div key={notif.id} className="bg-[#111] border border-gray-800 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className={[
                      'text-[10px] uppercase tracking-widest font-sans font-medium px-2 py-0.5 rounded',
                      notif.lida ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/30'
                    ].join(' ')}>
                      {notif.lida ? 'Lida' : 'Nova'}
                    </span>
                    {notif.lida ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#A69076]" />
                    )}
                  </div>
                  <h4 className="font-serif text-gray-200 mb-1">{notif.titulo}</h4>
                  <p className="text-xs text-gray-500 font-sans mb-2">{notif.mensagem}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 font-mono">
                      {new Date(notif.criado_em).toLocaleString('pt-BR')}
                    </span>
                    {!notif.lida && (
                      <button
                        onClick={() => handleMarcarLida(notif.id)}
                        className="text-xs text-[#A69076] hover:text-[#A69076]/80 underline"
                      >
                        Marcar como lida
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notificacoes;