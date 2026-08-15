import React from 'react';
import { Link } from 'react-router-dom';
import imgCar from '../assets/placeholders/capricorn-01-zagato-17 - car.webp';
import imgWatch from '../assets/placeholders/OMEGA_310.60.42.50.99.001_meteorite - watch.jpeg';

const Catalog = () => {
  // This will later be replaced by data fetched from the database
  const items = [
    {
      id: 1,
      title: 'Capricorn 01 Zagato',
      category: 'Automotive Excellence',
      description: 'A masterpiece of automotive engineering, combining classic Zagato lines with modern performance capabilities.',
      year: '2023',
      expert: 'Dr. Hans Werner',
      image: imgCar
    },
    {
      id: 3,
      title: 'Omega Meteorite',
      category: 'Rare Timepieces',
      description: 'Featuring a dial crafted from an actual slice of the Gibeon meteorite, making each piece entirely unique in the universe.',
      year: '2021',
      expert: 'Jean-Claude Biver',
      image: imgWatch
    }
  ];

  return (
    <div className="pt-24 pb-24 bg-[#0a0a0a]">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="mb-24 mt-12 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-serif mb-6 tracking-wider">RESTRICTED COLLECTION</h1>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            Our curation rejects the ordinary. Every listed piece holds an expert appraisal, documented provenance, and is available for immediate transaction under our secure escrow model.
          </p>
        </div>

        {/* Editorial List */}
        <div className="space-y-32 md:space-y-48">
          {items.map((item, index) => (
            <div key={item.id} className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-12 md:gap-24`}>
              
              {/* Image */}
              <div className="w-full md:w-3/5">
                <Link to={`/product/${item.id}`} className="block group relative overflow-hidden">
                  <div className="aspect-[4/3] bg-[#141414] relative">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500"></div>
                  </div>
                  {/* Digital Passport Mini Badge */}
                  <div className="absolute top-6 right-6 bg-black/80 backdrop-blur-md border border-[#A69076]/40 px-3 py-1.5 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#A69076]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="text-[9px] uppercase tracking-widest text-[#A69076]">Verified Appraisal</span>
                  </div>
                </Link>
              </div>

              {/* Content */}
              <div className="w-full md:w-2/5 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-xs uppercase tracking-[0.2em] text-[#A69076]">{item.category}</span>
                  <span className="w-12 h-[1px] bg-[#A69076]/40"></span>
                </div>
                
                <h2 className="text-3xl md:text-4xl font-serif mb-6 leading-tight">
                  <Link to={`/product/${item.id}`} className="hover:text-[#A69076] transition-colors">
                    {item.title}
                  </Link>
                </h2>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-8">
                  {item.description}
                </p>

                <div className="grid grid-cols-2 gap-8 border-t border-b border-[#141414] py-6 mb-10">
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Year</span>
                    <span className="text-sm">{item.year}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Validating Expert</span>
                    <span className="text-sm">{item.expert}</span>
                  </div>
                </div>

                <Link 
                  to={`/product/${item.id}`} 
                  className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.2em] hover:text-[#A69076] transition-colors w-max group"
                >
                  <span className="border-b border-transparent group-hover:border-[#A69076] transition-colors pb-1">Analyze Piece</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-32 text-center">
          <p className="text-sm text-gray-500 mb-6 italic">Access to restricted lots requires authentication.</p>
          <button className="border border-[#A69076] text-[#A69076] px-8 py-3 text-sm hover:bg-[#A69076] hover:text-black transition-colors duration-300 uppercase tracking-widest">
            Request Private Access
          </button>
        </div>

      </div>
    </div>
  );
};

export default Catalog;
