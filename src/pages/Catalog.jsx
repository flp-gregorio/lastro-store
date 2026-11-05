import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, X, ArrowLeft } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import { apiUrl } from '../api';

const CATEGORIES = [
  'TODOS',
  'ARTE',
  'COLECIONÁVEIS',
  'MOBILIÁRIO',
  'RELÓGIOS',
  'AUTOMOTIVO',
  'DIVERSOS'
];

const normalizeText = (text) => {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const Catalog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category and query filters from URL
  const activeCategory = searchParams.get('categoria') || 'TODOS';
  const queryParam = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(queryParam);

  // Keep local search input synced with URL
  useEffect(() => {
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch(apiUrl('/api/pecas'));
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleCategorySelect = (category) => {
    const newParams = new URLSearchParams(searchParams);
    if (category === 'TODOS') {
      newParams.delete('categoria');
    } else {
      newParams.set('categoria', category);
    }
    setSearchParams(newParams);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('q', val.trim());
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  // Filter items in memory based on category and query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter (case and accent insensitive)
      if (activeCategory && activeCategory !== 'TODOS') {
        const itemCat = normalizeText(item.category);
        const filterCat = normalizeText(activeCategory);
        if (itemCat !== filterCat && !itemCat.includes(filterCat)) {
          return false;
        }
      }

      // Search query filter
      if (queryParam.trim()) {
        const q = normalizeText(queryParam);
        const nameMatch = normalizeText(item.name).includes(q);
        const descMatch = normalizeText(item.description).includes(q);
        const catMatch = normalizeText(item.category).includes(q);
        const passportMatch = normalizeText(item.passportId).includes(q);
        const expertMatch = normalizeText(item.expertName).includes(q);

        if (!nameMatch && !descMatch && !catMatch && !passportMatch && !expertMatch) {
          return false;
        }
      }

      return true;
    });
  }, [items, activeCategory, queryParam]);

  const hasActiveFilters = (activeCategory && activeCategory !== 'TODOS') || Boolean(queryParam);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-gray-800 pb-8 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif mb-4 text-white">Catálogo de Peças</h1>
          <p className="text-gray-400 font-sans max-w-2xl text-sm leading-relaxed">
            Explore nossa seleção exclusiva de obras de arte, joias e relógios de alto padrão.
            Todas as peças contam com Passaporte Digital e procedência verificada.
          </p>
        </div>

        {/* Search bar inside catalog */}
        <div className="w-full md:w-80">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filtrar por nome, descrição, perito..." 
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full bg-[#111] border border-gray-800 py-2.5 pl-10 pr-10 text-gray-300 focus:outline-none focus:border-[#A69076] font-sans text-xs transition-colors"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
            {searchInput && (
              <button
                onClick={() => handleSearchChange({ target: { value: '' } })}
                className="absolute right-3 top-2.5 p-0.5 text-gray-500 hover:text-white"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        <Filter className="w-4 h-4 text-[#A69076] shrink-0 mr-2" />
        {CATEGORIES.map((cat) => {
          const isSelected =
            (cat === 'TODOS' && (!activeCategory || activeCategory === 'TODOS')) ||
            normalizeText(cat) === normalizeText(activeCategory);

          return (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={[
                'px-4 py-2 text-xs uppercase tracking-widest font-sans whitespace-nowrap transition-all border cursor-pointer',
                isSelected
                  ? 'bg-[#A69076] text-black border-[#A69076] font-semibold'
                  : 'bg-[#111] text-gray-400 border-gray-800 hover:border-gray-600 hover:text-white'
              ].join(' ')}
            >
              {cat}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs uppercase tracking-widest text-[#A69076] hover:underline font-sans ml-auto whitespace-nowrap px-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Filter status banner */}
      {hasActiveFilters && (
        <div className="mb-8 flex items-center gap-2 text-xs text-gray-400 font-sans">
          <span>Exibindo resultados para:</span>
          {activeCategory && activeCategory !== 'TODOS' && (
            <span className="bg-[#1c1c1c] text-white px-2.5 py-1 border border-gray-800">
              Categoria: <strong>{activeCategory}</strong>
            </span>
          )}
          {queryParam && (
            <span className="bg-[#1c1c1c] text-white px-2.5 py-1 border border-gray-800">
              Busca: "<strong>{queryParam}</strong>"
            </span>
          )}
          <span className="text-gray-600 ml-2">({filteredItems.length} peça{filteredItems.length !== 1 ? 's' : ''})</span>
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#A69076]"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-800 bg-[#0d0d0d] p-8">
          <p className="text-gray-400 font-serif text-xl mb-2">Nenhuma peça encontrada</p>
          <p className="text-gray-600 font-sans text-xs mb-6">
            Não encontramos itens que correspondam aos filtros selecionados.
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 bg-[#A69076] text-black px-6 py-2.5 text-xs font-sans uppercase tracking-widest font-semibold hover:bg-[#b8a287] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Ver todo o catálogo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;
