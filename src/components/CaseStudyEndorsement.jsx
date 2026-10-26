import React from 'react';

const CaseStudyEndorsement = () => {
  return (
    <section className="py-24 px-8 bg-[#0a0a0a] border-t border-[#1a1a1a]">
      <div className="container mx-auto text-center">
        {/* Quote Container */}
        <div className="max-w-4xl mx-auto">
          {/* Quote Icon */}
          <div className="text-[#A69076] text-6xl font-serif mb-6 opacity-50">"</div>
          
          {/* The Quote */}
          <h2 className="text-2xl md:text-4xl font-serif text-white leading-relaxed mb-10">
            A Lastro resolveu o maior gargalo da alta relojoaria e arte: a assimetria de informação. Ao imortalizar a procedência, eles não apenas protegem a peça, eles <span className="text-[#A69076]">multiplicam seu prêmio histórico</span>.
          </h2>
        </div>
        
        {/* The Author / Expert */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-px bg-[#A69076]/50 mb-6"></div>
          <p className="text-white font-bold tracking-widest uppercase text-sm mb-1">Guillaume V.</p>
          <p className="text-gray-500 text-xs uppercase tracking-widest">Curador Chefe, Casa de Leilões Independente</p>
        </div>

        {/* Mini Case Study (Optional but requested) */}
        <div className="mt-20 text-left bg-[#111] p-8 rounded-xl border border-[#222] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#A69076] opacity-5 rounded-bl-full pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="md:w-2/3">
              <span className="text-[#A69076] text-[10px] tracking-[0.2em] uppercase font-bold mb-2 block">Estudo de Caso</span>
              <h3 className="text-xl font-serif text-white mb-3">O Efeito Passaporte: Rolex Daytona 'Paul Newman'</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Em 2025, um colecionador anexou 40 anos de recibos de manutenção, fotos de época e dois certificados de autenticação independentes no Passaporte Lastro de sua peça. Na revenda privada 6 meses depois, a ausência total de dúvidas sobre a procedência resultou em um prêmio de liquidez de +18% acima do mercado.
              </p>
            </div>
            
            <div className="md:w-1/3 flex flex-row md:flex-col gap-4 border-t md:border-t-0 md:border-l border-[#222] pt-4 md:pt-0 md:pl-8">
              <div>
                <p className="text-[#A69076] font-serif text-3xl mb-1">+18%</p>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Prêmio de Venda</p>
              </div>
              <div>
                <p className="text-white font-serif text-2xl mb-1">0</p>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Dias de Auditoria Adicional</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default CaseStudyEndorsement;
