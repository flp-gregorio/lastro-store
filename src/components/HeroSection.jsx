import React, { useState } from 'react';
import imgKey from '../assets/placeholders/luxury-car-key.jpg';
import imgSculpture from '../assets/placeholders/The shape of Speed - Limited Edition - Formula 1 - sculpture.jpg';
import imgWatch from '../assets/placeholders/silver-watch.jpg';
import imgFurniture from '../assets/placeholders/UFO TAILOR MADE - furniture.webp';

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const images = [
    imgKey,
    imgSculpture,
    imgWatch,
    imgFurniture
  ];

  return (
    <section className="bg-[#0a0a0a] pt-24 lg:pt-32 pb-8 px-8 w-full flex justify-center">
      <div className="container mx-auto flex flex-col lg:flex-row w-full h-[70vh] lg:h-[80vh]">

        {/* Left Column - Copy */}
        <div className="w-full lg:w-4/12 flex flex-col justify-center pr-4 lg:pr-8 py-12 lg:py-0 bg-[#0a0a0a] z-20">
          <div className="max-w-xl">
            <h2 className="text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-serif leading-[1.1] mb-6 tracking-wide text-white">
              ARTEFATOS<br />
              EXCEPCIONAIS.<br />
              VALOR ATEMPORAL.
            </h2>
            <p className="text-gray-400 font-sans mb-10 text-sm md:text-base leading-relaxed max-w-sm tracking-wide">
              Seleção curada de arte rara, objetos icônicos e peças extraordinárias para um seleto grupo.
            </p>

            <button className="border border-white/30 text-white px-8 py-4 w-fit hover:border-[#A69076] hover:text-[#A69076] transition-all duration-300 text-[10px] md:text-xs tracking-[0.2em] uppercase flex items-center space-x-4 group">
              <span>EXPLORAR COLEÇÃO</span>
              <span className="group-hover:translate-x-1 transition-transform duration-300">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Right Column - Visual */}
        <div className="w-full lg:w-8/12 flex relative h-[50vh] lg:h-full bg-[#0a0a0a]">

          {/* Image Area */}
          <div className="flex-grow relative h-full overflow-hidden bg-[#1a1a1a]">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Artifact ${i + 1}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentSlide === i ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              />
            ))}

            {/* Left Fade */}
            <div className="absolute inset-y-0 left-0 w-16 md:w-20 bg-gradient-to-r from-[#0a0a0a] to-transparent z-20 pointer-events-none"></div>
            {/* Right Fade */}
            <div className="absolute inset-y-0 right-0 w-16 md:w-20 bg-gradient-to-l from-[#0a0a0a] to-transparent z-20 pointer-events-none"></div>
          </div>

          {/* Indicators Area */}
          <div className="w-12 md:w-16 flex-shrink-0 flex flex-col justify-center items-center relative z-30">
            {/* Vertical Indicators */}
            <div className="flex flex-col justify-center space-y-4">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className="relative flex items-center justify-center w-6 h-8 group focus:outline-none"
                  aria-label={`Go to slide ${i + 1}`}
                >
                  {currentSlide === i ? (
                    <div className="w-[1px] h-full bg-[#A69076] transition-all duration-300"></div>
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-white/30 group-hover:bg-[#A69076] transition-all duration-300"></div>
                  )}
                </button>
              ))}
            </div>

            {/* Pagination indicator (x / y) */}
            <div className="absolute bottom-6 md:bottom-10 w-full text-center">
              <span className="text-white/60 font-sans tracking-[0.2em] text-[10px] lg:text-xs">
                0{currentSlide + 1} <span className="mx-0.5 text-white/20">/</span> 0{images.length}
              </span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
