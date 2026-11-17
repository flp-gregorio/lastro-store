import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  Trash2,
  Edit2
} from 'lucide-react';
import { apiUrl, getCurrentUserId } from '../api';

const FREQUENCIAS = {
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual'
};

const Lembretes = () => {
  const [lembretes, setLembretes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    pecaId: '',
    tipo: 'conservacao',
    frequencia: 'semestral',
    proximaNotificacao: ''
  });
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  const ownerId = getCurrentUserId();

  useEffect(() => {
    carregarLembretes();
  }, [ownerId]);

  const carregarLembretes = async () => {
    try {
      const response = await fetch(apiUrl(`/api/lembretes?ownerId=${ownerId}&ativo=true`));
      if (response.ok) {
        const data = await response.json();
        setLembretes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar lembretes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editMode
        ? apiUrl(`/api/lembretes/${editId}`)
        : apiUrl('/api/lembretes');
      const method = editMode ? 'PUT' : 'POST';
      const body = JSON.stringify({
        ...form,
        pecaId: Number(form.pecaId),
        ownerId
      });
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (response.ok) {
        setEditMode(false);
        setEditId(null);
        setForm({ pecaId: '', tipo: 'conservacao', frequencia: 'semestral', proximaNotificacao: '' });
        carregarLembretes();
        window.dispatchEvent(new Event('lastro:notifications-updated'));
      } else {
        alert('Erro ao salvar lembrete.');
      }
    } catch (err) {
      console.error('Erro ao salvar lembrete:', err);
    }
  };

  const handleAtivarDesativar = async (lembreteId) => {
    try {
      const response = await fetch(apiUrl(`/api/lembretes/${lembreteId}?ownerId=${ownerId}`), {
        method: 'DELETE'
      });
      if (response.ok) {
        carregarLembretes();
      }
    } catch (err) {
      console.error('Erro ao desativar lembrete:', err);
    }
  };

  const handleEdit = (lembrete) => {
    setEditMode(true);
    setEditId(lembrete.id);
    setForm({
      pecaId: lembrete.peca_id?.toString() || '',
      tipo: lembrete.tipo,
      frequencia: lembrete.frequencia,
      proximaNotificacao: lembrete.proxima_notificacao || ''
    });
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
          <h1 className="text-4xl font-serif mb-2">Lembretes de Conservação</h1>
          <p className="text-gray-400 font-sans text-sm">
            Configure lembretes periódicos de manutenção e revisão para preservar o estado de conservação do seu acervo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-6">
              {editMode ? 'Editar Lembrete' : 'Novo Lembrete'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  ID da Peça
                </label>
                <input
                  type="number"
                  name="pecaId"
                  value={form.pecaId}
                  onChange={e => setForm({ ...form, pecaId: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
                  placeholder="Ex: 123"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Tipo de Lembrete
                </label>
                <select
                  name="tipo"
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm cursor-pointer"
                >
                  <option value="conservacao">Conservação</option>
                  <option value="revisao">Revisão</option>
                  <option value="limpeza">Limpeza</option>
                  <option value="avaliacao">Avaliação</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Frequência
                </label>
                <select
                  name="frequencia"
                  value={form.frequencia}
                  onChange={e => setForm({ ...form, frequencia: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm cursor-pointer"
                >
                  {Object.entries(FREQUENCIAS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Próxima Notificação (opcional)
                </label>
                <input
                  type="datetime-local"
                  name="proximaNotificacao"
                  value={form.proximaNotificacao}
                  onChange={e => setForm({ ...form, proximaNotificacao: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#A69076] text-black py-3.5 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors flex items-center justify-center gap-2"
              >
                {editMode ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editMode ? 'Atualizar' : 'Configurar Lembrete'}
              </button>
              {editMode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setEditId(null);
                    setForm({ pecaId: '', tipo: 'conservacao', frequencia: 'semestral', proximaNotificacao: '' });
                  }}
                  className="w-full border border-gray-700 text-gray-400 py-3.5 font-sans uppercase tracking-widest text-xs hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              )}
            </form>
          </div>
        </div>

        <div className="lg:col-span-8">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-6">
            Seus Lembretes Ativos ({lembretes.length})
          </h3>

          {lembretes.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d] p-8">
              <Clock className="w-12 h-12 text-gray-700 mb-4" />
              <p className="text-gray-400 font-serif text-xl mb-2">Nenhum lembrete configurado</p>
              <p className="text-gray-600 font-sans text-xs mb-6">
                Configure lembretes de conservação para receber notificações periódicas sobre o estado de suas peças.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {lembretes.map((lembrete) => (
                <div key={lembrete.id} className="bg-[#111] border border-gray-800 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-serif text-gray-200 mb-1">Lembrete de {FREQUENCIAS[lembrete.frequencia]?.toLowerCase() || lembrete.frequencia}</h4>
                      <p className="text-xs text-gray-500 font-sans">Tipo: {lembrete.tipo}</p>
                    </div>
                    <button
                      onClick={() => handleEdit(lembrete)}
                      className="text-gray-500 hover:text-[#A69076] transition-colors p-1"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs font-sans mb-3">
                    <span className="text-gray-400">Próxima notificação:</span>
                    <span className="text-gray-200 font-mono">
                      {lembrete.proxima_notificacao ? new Date(lembrete.proxima_notificacao).toLocaleDateString('pt-BR') : 'Não definida'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-sans text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400" /> Ativo
                    </span>
                    <button
                      onClick={() => handleAtivarDesativar(lembrete.id)}
                      className="text-xs font-sans text-red-500 hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-1 border border-red-500/30 rounded"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Desativar
                    </button>
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

export default Lembretes;