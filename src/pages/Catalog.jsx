import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import ItemCard from '../components/ItemCard';

const Catalog = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/pecas');
        const data = await response.json();
        setItems(data);
      } catch (error) {
        console.error('Error fetching items:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-gray-800 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-serif mb-4">Catálogo de Peças</h1>
          <p className="text-gray-400 font-sans max-w-2xl">
            Explore nossa seleção exclusiva de obras de arte, joias e relógios de alto padrão.
            Todas as peças possuem garantia de autenticidade Lastro.
          </p>
        </div>
        
        <div className="mt-8 md:mt-0 flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <input 
              type="text" 
              placeholder="Buscar peças..." 
              className="w-full bg-[#111] border border-gray-800 rounded-none py-2 pl-10 pr-4 text-gray-300 focus:outline-none focus:border-gray-500 font-sans transition-colors"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          </div>
          <button className="bg-[#111] border border-gray-800 px-4 py-2 flex items-center gap-2 hover:bg-[#1a1a1a] transition-colors">
            <Filter className="w-4 h-4" />
            <span className="font-sans text-sm">Filtros</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;
