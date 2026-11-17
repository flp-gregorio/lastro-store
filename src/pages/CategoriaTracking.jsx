import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Search,
  Check,
  Plus,
  Trash2,
  Watch,
  Sparkles,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { apiUrl, getCurrentUserId } from '../api';

const AVAILABLE_CATEGORIES = [
  { id: 'Relógios', label: 'Relógios', icon: Watch, desc: 'Alta relojoaria, peças vintage, cronógrafos raros e alta complicação' },
  { id: 'Arte', label: 'Arte', icon: Sparkles, desc: 'Pinturas, gravuras e esculturas com certificado' },
  { id: 'Colecionáveis', label: 'Colecionáveis', icon: Sparkles, desc: 'Memorabilia histórica e itens de exceção' },
  { id: 'Mobiliário', label: 'Mobiliário', icon: Sparkles, desc: 'Design modernista e clássicos consagrados' },
  { id: 'Automotivo', label: 'Automotivo', icon: Sparkles, desc: 'Veículos clássicos e esportivos de coleção' },
  { id: 'Joias', label: 'Joias', icon: Sparkles, desc: 'Alta joalheria, pedras raras e assinaturas' },
];

const formatCategoryLabel = (cat) =>
  /^watches$/i.test(String(cat || '').trim()) ? 'Relógios' : cat;

const CategoriaTracking = () => {
  const [trackedCategories, setTrackedCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Relógios');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const userId = getCurrentUserId();

  useEffect(() => {
    carregarCategoriasRastreadas();
  }, [userId]);

  const carregarCategoriasRastreadas = async () => {
    try {
      const response = await fetch(apiUrl(`/api/categorias-rastreadas?userId=${userId}`));
      if (response.ok) {
        const data = await response.json();
        setTrackedCategories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar categorias rastreadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const isCategoryTracked = (catLabel) => {
    const norm = (s) => {
      const v = (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
      return v === 'watches' || v === 'watch' || v === 'relogio' ? 'relogios' : v;
    };
    return trackedCategories.some(
      (c) => norm(c.categoria) === norm(catLabel)
    );
  };

  const handleAddCategory = async (catLabel) => {
    const categoryToAdd = catLabel || selectedCategory || searchQuery.trim();
    if (!categoryToAdd) return;

    if (isCategoryTracked(categoryToAdd)) {
      setMessage({ type: 'info', text: `Você já acompanha a categoria "${formatCategoryLabel(categoryToAdd)}".` });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(apiUrl('/api/categorias-rastreadas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          categoria: categoryToAdd
        })
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Categoria "${formatCategoryLabel(categoryToAdd)}" adicionada aos seus interesses!`
        });
        await carregarCategoriasRastreadas();
        setSearchQuery('');
      } else {
        setMessage({ type: 'error', text: result.message || 'Erro ao salvar preferência' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Falha de comunicação com o servidor' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleRemoveCategory = async (id, categoria) => {
    try {
      const response = await fetch(apiUrl(`/api/categorias-rastreadas/${id}?userId=${userId}`), {
        method: 'DELETE'
      });

      if (response.ok) {
        setTrackedCategories((prev) => prev.filter((c) => c.id !== id && c.categoria !== categoria));
        setMessage({ type: 'info', text: `Acompanhamento da categoria "${formatCategoryLabel(categoria)}" removido.` });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error('Erro ao remover categoria:', err);
    }
  };

  const filteredAvailable = AVAILABLE_CATEGORIES.filter((cat) =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-sans uppercase tracking-widest text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
        </Link>

        {/* Header */}
        <div className="border-b border-gray-800 pb-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2 rounded bg-[#A69076]/10 text-[#A69076] border border-[#A69076]/30">
              <Bell className="w-5 h-5" />
            </span>
            <span className="text-xs uppercase tracking-widest font-sans text-[#A69076]">
              Monitoramento de Acervo
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif text-white tracking-tight">
            Categorias de Interesse
          </h1>
          <p className="text-gray-400 font-sans text-sm mt-3 max-w-2xl leading-relaxed">
            Selecione categorias como <strong>Relógios</strong> para receber alertas imediatos quando novas peças
            forem submetidas à curadoria da Lastro ou quando laudos periciais forem homologados.
          </p>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-4 rounded mb-8 text-xs font-sans uppercase tracking-widest flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                : message.type === 'error'
                ? 'bg-red-950/60 border border-red-500/50 text-red-300'
                : 'bg-[#A69076]/15 border border-[#A69076]/40 text-[#A69076]'
            }`}
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Category Selection & Search */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#111] border border-gray-800 p-6 rounded-sm">
              <h2 className="text-lg font-serif text-white mb-4">Buscar e Selecionar Categoria</h2>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar categoria (ex: Relógios, Arte, Joias)..."
                  className="w-full bg-[#0a0a0a] border border-gray-700 pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans"
                />
              </div>

              {/* Categories Grid */}
              <div className="space-y-3">
                {filteredAvailable.map((cat) => {
                  const tracked = isCategoryTracked(cat.label);
                  const isSelected = selectedCategory === cat.label;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.label)}
                      className={`p-4 border rounded cursor-pointer transition-all flex items-center justify-between ${
                        tracked
                          ? 'border-emerald-500/40 bg-emerald-950/10'
                          : isSelected
                          ? 'border-[#A69076] bg-[#A69076]/10'
                          : 'border-gray-800 bg-[#0d0d0d] hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded flex items-center justify-center ${
                            tracked
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isSelected
                              ? 'bg-[#A69076]/20 text-[#A69076]'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          <cat.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-white text-base">{cat.label}</span>
                            {tracked && (
                              <span className="text-[9px] uppercase tracking-widest font-sans font-medium px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Acompanhando
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-sans mt-0.5">{cat.desc}</p>
                        </div>
                      </div>

                      {tracked ? (
                        <span className="text-emerald-400 text-xs flex items-center gap-1 font-sans">
                          <Check className="w-4 h-4" /> Ativo
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCategory(cat.label);
                          }}
                          disabled={saving}
                          className="bg-white/10 hover:bg-[#A69076] hover:text-black text-gray-300 px-3 py-1.5 text-xs font-sans uppercase tracking-wider transition-colors rounded"
                        >
                          Acompanhar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-6 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-sans">
                  Categoria selecionada: <strong className="text-white">{selectedCategory}</strong>
                </span>
                <button
                  onClick={() => handleAddCategory(selectedCategory)}
                  disabled={saving || isCategoryTracked(selectedCategory)}
                  className="bg-[#A69076] text-black px-6 py-3 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : isCategoryTracked(selectedCategory) ? (
                    <>
                      <Check className="w-4 h-4" /> Já Acompanhada
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" /> Salvar Interesse
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Tracked Categories List */}
          <div className="lg:col-span-5">
            <div className="bg-[#111] border border-gray-800 p-6 rounded-sm sticky top-28">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
                <div>
                  <h2 className="text-lg font-serif text-white">Suas Categorias Acompanhadas</h2>
                  <p className="text-xs text-gray-500 font-sans mt-0.5">
                    Preferências sincronizadas com sua conta
                  </p>
                </div>
                <span className="text-xs font-mono px-2 py-1 bg-gray-800 text-gray-300 rounded">
                  {trackedCategories.length} {trackedCategories.length === 1 ? 'categoria' : 'categorias'}
                </span>
              </div>

              {loading ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#A69076]" />
                </div>
              ) : trackedCategories.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-gray-800 rounded bg-[#0a0a0a] p-6">
                  <Bell className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-300 font-serif text-base mb-1">Nenhuma categoria acompanhada</p>
                  <p className="text-gray-500 text-xs font-sans max-w-xs mx-auto">
                    Selecione "Relógios" ou outras categorias ao lado para receber alertas sobre novas peças.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trackedCategories.map((item) => (
                    <div
                      key={item.id || item.categoria}
                      className="p-4 bg-[#0a0a0a] border border-gray-800 rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-white text-base">{formatCategoryLabel(item.categoria)}</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Desde {new Date(item.criado_em || Date.now()).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveCategory(item.id, item.categoria)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-2"
                        title="Remover acompanhamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="pt-4 mt-6 border-t border-gray-800">
                    <Link
                      to="/notificacoes"
                      className="w-full text-center block bg-white/10 hover:bg-white text-white hover:text-black py-3 text-xs font-sans uppercase tracking-widest transition-colors font-medium rounded"
                    >
                      Ver Minhas Notificações
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoriaTracking;
