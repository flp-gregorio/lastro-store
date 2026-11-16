import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Link2, Users, ArrowLeft, RefreshCw, Clock, CreditCard } from 'lucide-react';
import { apiUrl } from '../api';

const formatPrice = (value) => {
  if (!value && value !== 0) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const Transferencias = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [transferencias, setTransferencias] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('minhas');
  const [form, setForm] = useState({
    pecaId: '',
    passportId: '',
    paraUsuarioId: '',
    tipoTransferencia: 'venda',
    valorTransacao: '',
    observacoes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userId = localStorage.getItem('userId') || '';
  const passportParam = searchParams.get('passportId') || '';

  useEffect(() => {
    if (passportParam) setForm((prev) => ({ ...prev, passportId: passportParam }));
  }, [passportParam]);

  const loadTransferencias = async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('deUsuarioId', userId);
      const res = await fetch(apiUrl(`/api/transferencias?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setTransferencias(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar transferências:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistorico = async (passportId) => {
    try {
      const res = await fetch(apiUrl(`/api/transferencias/historico/${passportId}`));
      if (res.ok) {
        const data = await res.json();
        setHistorico(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!userId) { setError('Usuário não autenticado.'); return; }
    if (!form.passportId) { setError('Informe o ID do Passaporte.'); return; }
    if (!form.paraUsuarioId) { setError('Informe o ID do destinatário.'); return; }
    try {
      const res = await fetch(apiUrl('/api/transferencias'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pecaId: form.pecaId || undefined, passportId: form.passportId,
          paraUsuarioId: form.paraUsuarioId, tipoTransferencia: form.tipoTransferencia,
          valorTransacao: form.valorTransacao || undefined, observacoes: form.observacoes,
          deUsuarioId: userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao registrar transferência');
      setSuccess('Transferência registrada com sucesso!');
      setForm((prev) => ({ ...prev, pecaId: '', valorTransacao: '', observacoes: '' }));
      setShowForm(false);
      loadTransferencias();
      if (form.passportId) loadHistorico(form.passportId);
    } catch (err) {
      setError(err.message);
    }
  };

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
          <h1 className="text-4xl font-serif text-white mb-2">Transferência de Passaporte</h1>
          <p className="text-gray-400 font-sans text-sm">
            Transfira a titularidade de um passaporte para outro usuário. O histórico da peça é preservado.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#A69076] text-black px-6 py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors"
          >
            {showForm ? 'Cancelar' : 'Nova Transferência'}
          </button>
          <Link to="/dashboard" className="border border-gray-700 text-gray-300 px-4 py-2.5 hover:border-white transition-colors flex items-center gap-2 text-xs font-sans uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-500/80 text-red-200 px-4 py-3 mb-6 font-sans text-xs text-center leading-relaxed">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/40 border border-emerald-500/80 text-emerald-200 px-4 py-3 mb-6 font-sans text-xs text-center leading-relaxed">
          {success}
        </div>
      )}

      {/* Abas */}
      <div className="mb-8 flex gap-4 border-b border-gray-800 pb-4">
        <button
          onClick={() => { setActiveTab('minhas'); loadTransferencias(); }}
          className={`px-4 py-2 text-xs font-sans uppercase tracking-widest border-b-2 ${activeTab === 'minhas' ? 'border-[#A69076] text-[#A69076]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Minhas Transferências
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 text-xs font-sans uppercase tracking-widest border-b-2 ${activeTab === 'historico' ? 'border-[#A69076] text-[#A69076]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
        >
          Histórico por Passaporte
        </button>
      </div>

      {/* Formulário de nova transferência */}
      {showForm && activeTab === 'minhas' && (
        <div className="mb-8 bg-[#111] border border-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-serif text-white mb-4">Registrar Transferência</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">ID do Passaporte *</label>
                <input type="text" required value={form.passportId} onChange={(e) => setForm({ ...form, passportId: e.target.value })} className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm" placeholder="Ex: LST-9F4A2C8E1B0D" />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">ID do Destinatário *</label>
                <input type="text" required value={form.paraUsuarioId} onChange={(e) => setForm({ ...form, paraUsuarioId: e.target.value })} className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm" placeholder="ID do usuário destinatário" />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Tipo de Transferência</label>
                <select required value={form.tipoTransferencia} onChange={(e) => setForm({ ...form, tipoTransferencia: e.target.value })} className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm">
                  <option value="venda">Venda</option>
                  <option value="revenda">Revenda</option>
                  <option value="doacao">Doação</option>
                  <option value="heranca">Herança</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">ID da Peça (opcional)</label>
                <input type="text" value={form.pecaId} onChange={(e) => setForm({ ...form, pecaId: e.target.value })} className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm" placeholder="ID numérico da peça" />
              </div>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Valor da Transação (opcional)</label>
                <input type="text" value={form.valorTransacao} onChange={(e) => setForm({ ...form, valorTransacao: e.target.value })} className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm" placeholder="Ex: 15000,00" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm" placeholder="Observações sobre a transferência..." />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" className="flex-1 bg-[#A69076] text-black px-6 py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors">Registrar Transferência</button>
              <button type="button" onClick={() => setShowForm(false)} className="border border-gray-700 text-gray-300 px-6 py-3 font-sans uppercase tracking-widest text-xs hover:border-white transition-colors">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Conteúdo das abas */}
      {activeTab === 'minhas' ? (
        <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
          <div className="border-b border-gray-800 p-4 bg-[#0a0a0a]">
            <h2 className="text-xl font-serif text-white mb-1">Minhas Transferências</h2>
            <p className="text-gray-500 text-xs">{transferencias.length} transferência{transferencias.length !== 1 ? 's' : ''} registrada{transferencias.length !== 1 ? 's' : ''}</p>
          </div>
          {transferencias.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d]">
              <Users className="w-12 h-12 text-gray-700 mb-4 mx-auto" />
              <p className="text-gray-400 font-serif text-xl mb-2">Nenhuma transferência registrada</p>
              <p className="text-gray-600 font-sans text-xs mb-6">Use o formulário acima para registrar uma transferência de passaporte para outro usuário.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {transferencias.map((t) => (
                <div key={t.id} className="p-4 hover:bg-[#0a0a0a] transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Link2 className="w-4 h-4 text-[#A69076]" />
                      <span className="text-xs font-mono text-gray-400 truncate w-48">{t.passport_id}</span>
                      <span className="text-[10px] bg-[#A69076]/20 text-[#A69076] border border-[#A69076]/30 px-2 py-0.5 rounded-full font-sans ml-2">{t.tipo_transferencia}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">{new Date(t.data_transferencia).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-gray-500 font-sans">
                    <div><span className="block font-bold text-gray-300 mb-1">De</span><span className="font-mono truncate">{t.de_usuario_id}</span></div>
                    <div><span className="block font-bold text-gray-300 mb-1">Para</span><span className="font-mono truncate">{t.para_usuario_id}</span></div>
                    <div><span className="block font-bold text-gray-300 mb-1">Valor</span><span>{formatPrice(t.valor_transacao)}</span></div>
                    <div><span className="block font-bold text-gray-300 mb-1">Histórico</span><span className="text-emerald-400">Preservado</span></div>
                  </div>
                  {t.observacoes && <p className="mt-2 text-sm text-gray-400">{t.observacoes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#111] border border-gray-800 rounded-lg overflow-hidden">
          <div className="border-b border-gray-800 p-4 bg-[#0a0a0a]">
            <h2 className="text-xl font-serif text-white mb-1">Histórico de Transferências por Passaporte</h2>
            <p className="text-gray-500 text-xs">Insira um ID do Passaporte para ver o histórico de transferências dessa peça.</p>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">ID do Passaporte</label>
              <input type="text" value={form.passportId} onChange={(e) => setForm({ ...form, passportId: e.target.value })} className="w-full max-w-md bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm" placeholder="Ex: LST-9F4A2C8E1B0D" />
            </div>
            <button onClick={() => form.passportId && loadHistorico(form.passportId)} disabled={!form.passportId} className="bg-[#A69076] text-black px-4 py-2 font-sans uppercase tracking-widest text-xs hover:bg-[#b8a287] transition-colors disabled:opacity-50">Carregar Histórico</button>
          </div>
          {historico.length === 0 && form.passportId && (
            <div className="text-center py-16 border border-dashed border-gray-800 bg-[#0d0d0d]">
              <Clock className="w-12 h-12 text-gray-700 mb-4 mx-auto" />
              <p className="text-gray-400 font-serif text-xl mb-2">Nenhum histórico encontrado</p>
              <p className="text-gray-600 font-sans text-xs">Este passaporte ainda não possui transferências registradas.</p>
            </div>
          )}
          {historico.length > 0 && (
            <div className="divide-y divide-gray-800">
              {historico.map((t) => (
                <div key={t.id} className="p-4 hover:bg-[#0a0a0a] transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-[#A69076]" />
                      <span className="text-xs font-mono text-gray-400 truncate w-48">{t.passport_id}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">{new Date(t.data_transferencia).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500 font-sans">
                    <div><span className="block font-bold text-gray-300 mb-1">De</span><span className="font-mono truncate">{t.de_usuario_id}</span></div>
                    <div><span className="block font-bold text-gray-300 mb-1">Para</span><span className="font-mono truncate">{t.para_usuario_id}</span></div>
                    <div><span className="block font-bold text-gray-300 mb-1">Tipo</span><span>{t.tipo_transferencia}</span></div>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 font-sans">Histórico preservado: Sim</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {transferencias.length > 0 && activeTab === 'minhas' && (
        <div className="mt-6 text-center">
          <button onClick={loadTransferencias} className="text-[#A69076] hover:text-[#b8a287] text-xs font-sans uppercase tracking-widest flex items-center justify-center gap-2"><RefreshCw className="w-3 h-3" /> Atualizar lista</button>
        </div>
      )}
    </div>
  );
};

export default Transferencias;