import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PassportBadge from '../components/PassportBadge';
import EscrowModal from '../components/EscrowModal';
import imgCar from '../assets/placeholders/capricorn-01-zagato-17 - car.webp';
import imgCarDetail1 from '../assets/placeholders/capricorn-01-zagato-17 - car.webp'; // Reusing for placeholder
import imgCarDetail2 from '../assets/placeholders/capricorn-01-zagato-17 - car.webp'; // Reusing for placeholder

const ProductDetails = () => {
  const { id } = useParams();
  const [isEscrowOpen, setIsEscrowOpen] = useState(false);

  // Placeholder data that will be fetched from DB later
  const product = {
    title: 'Capricorn 01 Zagato',
    category: 'Automotive Excellence',
    price: 'Price on Request', // e.g., $ 250,000
    description: 'The Capricorn 01 Zagato represents the pinnacle of automotive engineering combined with the timeless design of the Italian coachbuilder Zagato. Produced in an extremely limited run, this specific exemplar (chassis #04) features a fully traceable ownership history and all maintenance documented at an official dealership.',
    specs: [
      { label: 'Year', value: '2023' },
      { label: 'Mileage', value: '1,200 km' },
      { label: 'Engine', value: 'V8 Twin-Turbo' },
      { label: 'Exterior', value: 'Rosso Corsa' },
    ],
    expert: {
      name: 'Dr. Hans Werner',
      institution: 'Swiss Gemological Laboratory (Example)'
    },
    passport: {
      blockchainTx: '0x7a8...3f1c',
      issueDate: '08/12/2026'
    },
    images: [imgCar, imgCarDetail1, imgCarDetail2]
  };

  return (
    <div className="pt-24 pb-24 bg-[#0a0a0a]">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500">
          <Link to="/" className="hover:text-[#A69076] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-[#A69076] transition-colors">Collection</Link>
          <span>/</span>
          <span className="text-[#A69076]">{product.category}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24">
          
          {/* Images Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="aspect-[4/3] bg-[#141414] relative">
              <img src={product.images[0]} alt={product.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="aspect-[4/3] bg-[#141414] relative">
                <img src={product.images[1]} alt="Detail 1" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              <div className="aspect-[4/3] bg-[#141414] relative">
                <img src={product.images[2]} alt="Detail 2" className="absolute inset-0 w-full h-full object-cover" />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="lg:col-span-5 flex flex-col">
            <h1 className="text-3xl md:text-5xl font-serif mb-4 leading-tight">{product.title}</h1>
            <p className="text-[#A69076] text-sm uppercase tracking-widest mb-8">{product.category}</p>
            
            <div className="mb-10">
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                {product.description}
              </p>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 border-t border-[#141414] pt-6">
                {product.specs.map((spec, index) => (
                  <div key={index}>
                    <span className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{spec.label}</span>
                    <span className="text-sm text-gray-200">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Passport Badge */}
            <div className="mb-10">
              <PassportBadge expert={product.expert} passport={product.passport} />
            </div>

            {/* Actions */}
            <div className="mt-auto pt-8 border-t border-[#141414]">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs uppercase tracking-widest text-gray-500">Estimated Value</span>
                <span className="text-xl font-serif">{product.price}</span>
              </div>
              
              <button 
                onClick={() => setIsEscrowOpen(true)}
                className="w-full bg-[#A69076] text-black font-bold text-sm uppercase tracking-widest py-4 hover:bg-[#8c7860] transition-colors mb-4"
              >
                Propose Purchase (Escrow)
              </button>
              
              <button className="w-full border border-gray-600 text-gray-300 text-sm uppercase tracking-widest py-4 hover:border-[#A69076] hover:text-[#A69076] transition-colors flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Speak with Concierge
              </button>
            </div>

          </div>
        </div>
      </div>

      <EscrowModal 
        isOpen={isEscrowOpen} 
        onClose={() => setIsEscrowOpen(false)} 
        price={product.price}
      />
    </div>
  );
};

export default ProductDetails;
