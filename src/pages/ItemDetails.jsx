import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Info, FileText } from 'lucide-react';

const ItemDetails = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/pecas/${id}`);
        if (!response.ok) throw new Error('Not found');
        const data = await response.json();
        setItem(data);
      } catch (error) {
        console.error('Error fetching item:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!item) return <div className="text-center py-24">Peça não encontrada</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
      <Link to="/catalogo" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-sans uppercase tracking-widest text-xs">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Catálogo
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
        {/* Imagem */}
        <div className="relative aspect-square lg:aspect-[4/5] bg-[#111]">
          <img 
            src={item.image} 
            alt={item.name} 
            className="object-cover w-full h-full opacity-90"
          />
        </div>

        {/* Detalhes */}
        <div className="flex flex-col justify-center">
          <p className="text-sm font-sans tracking-widest uppercase text-gray-500 mb-4">
            {item.category}
          </p>
          <h1 className="text-4xl md:text-5xl font-serif mb-6">{item.name}</h1>
          <p className="text-2xl font-sans text-gray-200 mb-8">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
          </p>

          <div className="prose prose-invert font-sans text-gray-400 mb-12">
            <p>{item.description}</p>
          </div>

          {/* Passaporte Digital Section */}
          <div className="bg-[#111] border border-gray-800 p-6 md:p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-serif text-white">Passaporte Digital</h3>
            </div>
            
            <div className="space-y-4 font-sans text-sm">
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">ID do Passaporte</span>
                <span className="text-gray-200 tracking-wider font-mono">{item.passportId}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Status</span>
                <span className="text-emerald-400 uppercase tracking-widest text-xs font-medium">{item.status}</span>
              </div>
              <div className="flex justify-between border-b border-gray-800 pb-2">
                <span className="text-gray-500">Perito Responsável</span>
                <span className="text-gray-200">{item.expertName}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-gray-500">Data do Laudo</span>
                <span className="text-gray-200">{item.expertDate}</span>
              </div>
            </div>
            
            <button className="mt-6 w-full flex items-center justify-center gap-2 bg-white text-black py-3 font-sans uppercase tracking-widest text-xs font-medium hover:bg-gray-200 transition-colors">
              <FileText className="w-4 h-4" /> Visualizar Laudo Completo
            </button>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 bg-white text-black py-4 font-sans uppercase tracking-widest text-sm hover:bg-gray-200 transition-colors">
              Enviar Proposta
            </button>
            <button className="px-6 border border-gray-600 hover:border-white transition-colors flex items-center justify-center">
              <Info className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetails;
