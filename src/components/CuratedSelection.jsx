import React from 'react';
import imgKey from '../assets/placeholders/luxury-car-key.jpg';
import imgSculpture from '../assets/placeholders/The shape of Speed - Limited Edition - Formula 1 - sculpture.jpg';
import imgWatch from '../assets/placeholders/silver-watch.jpg';
import imgFurniture from '../assets/placeholders/UFO TAILOR MADE - furniture.webp';

const CuratedSelection = () => {
  const items = [
    {
      id: 1,
      title: 'Chave Mestra Zagato',
      category: 'Excelência Automotiva',
      image: imgKey
    },
    {
      id: 2,
      title: 'A Forma da Velocidade',
      category: 'Escultura Edição Limitada',
      image: imgSculpture
    },
    {
      id: 3,
      title: 'Elegância Prateada',
      category: 'Relógios Raros',
      image: imgWatch
    },
    {
      id: 4,
      title: 'Sob Medida',
      category: "Mobiliário de Colecionador",
      image: imgFurniture
    }
  ];

  return (
    <section className="bg-[#0a0a0a] py-16 px-8">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center mb-12">
          <h2 className="text-2xl font-serif tracking-widest">SELEÇÃO CURADA</h2>
          <div className="flex-grow border-t border-[#A69076]/40 mx-6"></div>
          <a href="#" className="text-xs uppercase tracking-[0.2em] text-gray-400 hover:text-[#A69076] transition-colors duration-300">
            VER TODOS -&gt;
          </a>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {items.map((item) => (
            <div key={item.id} className="bg-[#141414] rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 group cursor-pointer">
              <div className="bg-[#1a1a1a] h-64 flex items-center justify-center relative overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
              <div className="p-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg md:text-xl font-serif mb-1 group-hover:text-[#A69076] transition-colors duration-300">{item.title}</h3>
                  <p className="text-gray-500 text-[10px] md:text-xs tracking-wider uppercase">{item.category}</p>
                </div>
                <div className="text-[#A69076] text-lg flex items-center transition-transform duration-300 group-hover:translate-x-2">
                  &rarr;
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CuratedSelection;
