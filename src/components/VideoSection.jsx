import React from 'react';
import { Play } from 'lucide-react';

const VideoSection = () => {
  return (
    <section className="py-24 px-8 bg-[#050505] relative overflow-hidden">
      <div className="container mx-auto">
        <div className="text-center mb-16 relative z-10">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">A Imortalidade da Procedência</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Veja como transformamos bens físicos de alto valor em registros digitais inalteráveis e de validade perpétua através do Padrão Lastro.
          </p>
        </div>

        {/* Video Mockup Container */}
        <div className="relative w-full aspect-video mx-auto bg-[#1a1a1a] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(166,144,118,0.1)] group cursor-pointer border border-[#2a2a2a]">
          {/* Overlay gradient for premium feel */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
          
          {/* Placeholder Image (Dark luxury texture or abstract) */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-700 mix-blend-luminosity"></div>

          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-[#A69076] flex items-center justify-center bg-black/40 backdrop-blur-sm group-hover:bg-[#A69076]/20 transition-all duration-500 hover:scale-105">
              <Play className="w-8 h-8 md:w-10 md:h-10 text-[#A69076] ml-2" fill="currentColor" />
            </div>
          </div>

          {/* Video Mockup Details */}
          <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
            <div className="flex items-end justify-between w-full">
              <div>
                <span className="text-[#A69076] text-[10px] tracking-[0.3em] uppercase mb-2 block font-bold">Filme Conceito</span>
                <h3 className="text-white font-serif text-2xl md:text-3xl">O Passaporte Digital</h3>
              </div>
              <div className="hidden md:flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-white/50"></div>
                <div className="w-2 h-2 rounded-full bg-white/50"></div>
                <div className="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
