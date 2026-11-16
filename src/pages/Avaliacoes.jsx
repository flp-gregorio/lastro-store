import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, User, ArrowLeft, RefreshCw } from 'lucide-react';
import { apiUrl } from '../api';

const Avaliacoes = () => {
  const [searchParams] = useSearchParams();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    avaliadoId: '',
    pecaId: '',
    nota: 5,
    comentario: '',
    interacaoTipo: 'consulta',
    interacaoId: '',
    visibilidade: 'publica',
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userId = localStorage.getItem('userId') || '';
  const pecaIdParam = searchParams.get('pecaId') || '';
  const avaliadoIdParam = searchParams.get('avaliadoId') || '';

  const loadAvaliacoes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (pecaIdParam) params.set('pecaId', pecaIdParam);
      if (avaliadoIdParam) params.set('avaliadoId', avaliadoIdParam);
      params.set('limit', '50');
      params.set('offset', '0');

      const res = await fetch(apiUrl(`/api/avaliacoes?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setAvaliacoes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    } finally {
      setLoading(false);
    }
  }, [pecaIdParam, avaliadoIdParam]);

  const loadEstatisticas = useCallback(async (id) => {
    if (!id) return;
    try {
      const res = await fetch(apiUrl(`/api/avaliacoes/estatisticas/${id}`));
      if (res.ok) {
        const data = await res.json();
        setEstatisticas(data);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  }, []);

  useEffect(() => {
    if (pecaIdParam) setForm((prev) => ({ ...prev, pecaId: pecaIdParam }));
    if (avaliadoIdParam) setForm((prev) => ({ ...prev, avaliadoId: avaliadoIdParam }));
    loadAvaliacoes();
    if (avaliadoIdParam) {
      loadEstatisticas(avaliadoIdParam);
    }
  }, [pecaIdParam, avaliadoIdParam, loadAvaliacoes, loadEstatisticas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!userId) {
      setError('Usuário não autenticado. Faça login para avaliar.');
      return;
    }
    if (!form.avaliadoId) {
      setError('Informe o usuário avaliado.');
      return;
    }
    if (String(userId) === String(form.avaliadoId)) {
      setError('Não é possível auto-avaliar.');
      return;
    }

    try {
      const res = await fetch(apiUrl('/api/avaliacoes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avaliadorId: userId,
          avaliadoId: form.avaliadoId,
          pecaId: form.pecaId || undefined,
          nota: Number(form.nota),
          comentario: form.comentario,
          interacaoTipo: form.interacaoTipo,
          interacaoId: form.interacaoId || undefined,
          visibilidade: form.visibilidade,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao criar avaliação');

      setSuccess('Avaliação registrada com sucesso!');
      setForm((prev) => ({ ...prev, comentario: '', nota: 5 }));
      setShowForm(false);
      loadAvaliacoes();
      if (form.avaliadoId) loadEstatisticas(form.avaliadoId);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#0a0a0a]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#A69076]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen bg-[#0a0a0a] text-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-gray-800 pb-8 gap-4">
        <div>
          <h1 className="text-4xl font-serif text-white mb-2">Avaliações de Contraparte</h1>
          <p className="text-gray-400 font-sans text-sm">
            Avalie usuários com quem interagiu. Sua avaliação ajuda a construir confiança na comunidade Lastro.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#A69076] text-black px-6 py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors rounded"
          >
            {showForm ? 'Cancelar' : 'Nova Avaliação'}
          </button>
          <Link
            to="/dashboard"
            className="border border-gray-700 text-gray-300 px-4 py-2.5 hover:border-white transition-colors text-xs font-sans uppercase tracking-wider flex items-center gap-2 rounded"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-500/80 text-red-200 px-4 py-3 mb-6 font-sans text-xs text-center leading-relaxed rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/40 border border-emerald-500/80 text-emerald-200 px-4 py-3 mb-6 font-sans text-xs text-center leading-relaxed rounded">
          {success}
        </div>
      )}

      {/* Formulário de nova avaliação */}
      {showForm && (
        <div className="mb-8 bg-[#111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-serif text-white mb-4">Registrar Avaliação</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Usuário Avaliado (ID)
                </label>
                <input
                  type="text"
                  required
                  value={form.avaliadoId}
                  onChange={(e) => setForm({ ...form, avaliadoId: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm rounded"
                  placeholder="ID do usuário avaliado"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Nota (1 a 5)
                </label>
                <select
                  required
                  value={form.nota}
                  onChange={(e) => setForm({ ...form, nota: Number(e.target.value) })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm rounded"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} estrela{n > 1 ? 's' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Tipo de Interação
                </label>
                <select
                  required
                  value={form.interacaoTipo}
                  onChange={(e) => setForm({ ...form, interacaoTipo: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm rounded"
                >
                  <option value="consulta">Consulta</option>
                  <option value="proposta">Proposta</option>
                  <option value="negociacao">Negociação</option>
                  <option value="transferencia">Transferência</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  ID da Peça (opcional)
                </label>
                <input
                  type="text"
                  value={form.pecaId}
                  onChange={(e) => setForm({ ...form, pecaId: e.target.value })}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm rounded"
                  placeholder="ID da peça relacionada"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Comentário
                </label>
                <textarea
                  required
                  value={form.comentario}
                  onChange={(e) => setForm({ ...form, comentario: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm rounded"
                  placeholder="Descreva sua experiência..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-gray-400 font-sans text-xs tracking-widest uppercase mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.visibilidade === 'publica'}
                    onChange={(e) =>
                      setForm({ ...form, visibilidade: e.target.checked ? 'publica' : 'privada' })
                    }
                    className="w-4 h-4 text-[#A69076] bg-[#0a0a0a] border-gray-700 rounded focus:ring-[#A69076]"
                  />
                  Avaliação pública
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-[#A69076] text-black px-6 py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors rounded"
              >
                Registrar Avaliação
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-700 text-gray-300 px-6 py-3 font-sans uppercase tracking-widest text-xs hover:border-white transition-colors rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estatísticas do avaliado */}
      {estatisticas && (
        <div className="mb-8 bg-[#111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-serif text-white mb-4">Estatísticas do Avaliado</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0a0a0a] p-4 rounded border border-gray-800">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Total de Avaliações</p>
              <p className="text-3xl font-serif text-white">{estatisticas.totalAvaliacoes}</p>
            </div>
            <div className="bg-[#0a0a0a] p-4 rounded border border-gray-800">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Média de Notas</p>
              <p className="text-3xl font-serif text-[#A69076]">{estatisticas.mediaAvaliacoes}</p>
            </div>
            <div className="bg-[#0a0a0a] p-4 rounded border border-gray-800">
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">ID do Avaliado</p>
              <p className="text-xl font-mono text-gray-300 truncate">{estatisticas.avaliadoId}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de avaliações */}
      <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
        <div className="border-b border-gray-800 p-4 bg-[#0a0a0a]">
          <h2 className="text-xl font-serif text-white mb-1">Avaliações Recentes</h2>
          <p className="text-gray-500 text-xs">
            {avaliacoes.length}{' '}
            {avaliacoes.length === 1 ? 'avaliação encontrada' : 'avaliações encontradas'}
          </p>
        </div>

        {avaliacoes.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d]">
            <Star className="w-12 h-12 text-gray-700 mb-4 mx-auto" />
            <p className="text-gray-400 font-serif text-xl mb-2">Nenhuma avaliação encontrada</p>
            <p className="text-gray-600 font-sans text-xs mb-6">
              Seja o primeiro a avaliar uma contraparte. Sua avaliação ajuda a comunidade Lastro.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {avaliacoes.map((a) => (
              <div key={a.id} className="p-4 hover:bg-[#0a0a0a] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-mono text-gray-400 truncate w-48">{a.avaliador_id}</span>
                    <span className="text-[10px] bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/30 px-2 py-0.5 rounded-full font-sans ml-2">
                      {a.visibilidade}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-gray-500">
                    {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`w-4 h-4 ${n <= a.nota ? 'text-[#A69076] fill-[#A69076]' : 'text-gray-700'}`}
                    />
                  ))}
                  <span className="text-xs font-mono text-gray-400 ml-1">{a.nota}/5</span>
                </div>
                {a.comentario && (
                  <p className="text-sm text-gray-300 mb-2">{a.comentario}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 font-sans">
                  <span>
                    <span className="font-bold text-gray-300">Tipo:</span> {a.interacao_tipo}
                  </span>
                  {a.peca_id && (
                    <span>
                      <span className="font-bold text-gray-300">Peça:</span> #{a.peca_id}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {avaliacoes.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadAvaliacoes}
            className="text-[#A69076] hover:text-[#b8a287] text-xs font-sans uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw className="w-3 h-3" /> Atualizar lista
          </button>
        </div>
      )}
    </div>
  );
};

export default Avaliacoes;