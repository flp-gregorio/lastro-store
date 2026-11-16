import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

const ItemCard = ({ item }) => {
  const s = String(item.status || '').toUpperCase();
  const isPending = s === 'UNDER_VALIDATION' || s === 'EM REVISÃO' || s === 'EM REVISAO' || s === 'PENDENTE' || s === 'EM ANÁLISE';
  const isApproved = s === 'APPROVED' || s === 'VERIFICADO' || s === 'DISPONÍVEL' || s === 'VALIDO';
  const displayCategory = /^watches$/i.test(String(item.category || '').trim()) ? 'Relógios' : item.category;

  return (
    <Link to={`/peca/${item.id || item.passportId}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#111] mb-6">
        <img 
          src={item.image} 
          alt={item.name} 
          className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100"
        />
        {/* Status badge */}
        {isPending ? (
          <div className="absolute top-4 right-4 text-[9px] uppercase tracking-widest font-sans font-bold px-2.5 py-1 rounded border bg-amber-500/25 text-amber-300 border-amber-500/40 backdrop-blur-md shadow-lg flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Em análise
          </div>
        ) : isApproved ? (
          <div className="absolute top-4 right-4 text-[9px] uppercase tracking-widest font-sans font-semibold px-2.5 py-1 rounded border bg-emerald-500/25 text-emerald-300 border-emerald-500/40 backdrop-blur-md shadow-lg flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Verificado
          </div>
        ) : item.status ? (
          <div className="absolute top-4 right-4 text-[9px] uppercase tracking-widest font-sans px-2 py-1 rounded border bg-gray-500/20 text-gray-400 border-gray-500/30 backdrop-blur-md">
            {item.status}
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <p className="text-sm font-sans tracking-widest uppercase text-gray-500">
            {displayCategory}
          </p>
        </div>
        <h3 className="text-xl font-serif text-gray-200 group-hover:text-white transition-colors">
          {item.name}
        </h3>
        <p className="font-sans text-gray-400">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
        </p>
      </div>
    </Link>
  );
};

export default ItemCard;
