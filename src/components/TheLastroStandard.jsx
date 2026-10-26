import React from 'react';

const TheLastroStandard = () => {
  return (
    <section className="py-24 px-8 bg-[#050505] relative border-t border-[#1a1a1a]">
      {/* Subtle background element */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#A69076]/5 via-black/0 to-transparent pointer-events-none"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">A Evolução da Confiança</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Por décadas, o mercado secundário de alto luxo operou com assimetria e riscos. O Padrão Lastro redefine a forma como o valor é preservado e transacionado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#222222] p-px rounded-xl overflow-hidden shadow-2xl">
          {/* Traditional Market */}
          <div className="bg-[#0a0a0a] p-10 md:p-14">
            <h3 className="text-gray-500 font-serif text-2xl mb-8">O Mercado Tradicional</h3>
            <ul className="space-y-6">
              <li className="flex items-start space-x-4">
                <span className="text-gray-600 mt-1">✕</span>
                <div>
                  <h4 className="text-gray-300 font-bold mb-1">Documentação Física</h4>
                  <p className="text-gray-500 text-sm">Certificados de papel que podem ser perdidos, forjados ou danificados com o tempo.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <span className="text-gray-600 mt-1">✕</span>
                <div>
                  <h4 className="text-gray-300 font-bold mb-1">Histórico Fragmentado</h4>
                  <p className="text-gray-500 text-sm">Informação se perde a cada revenda. Dependência da memória ou boca a boca.</p>
                </div>
              </li>
              <li className="flex items-start space-x-4">
                <span className="text-gray-600 mt-1">✕</span>
                <div>
                  <h4 className="text-gray-300 font-bold mb-1">Baixa Liquidez</h4>
                  <p className="text-gray-500 text-sm">Compradores exigem peritagem a cada transação, atrasando ou inviabilizando vendas.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* The Lastro Standard */}
          <div className="bg-[#0f0f0f] p-10 md:p-14 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-[#A69076]/10 to-transparent"></div>
            <div className="relative z-10">
              <h3 className="text-[#A69076] font-serif text-2xl mb-8 flex items-center">
                O Padrão Lastro
                <div className="ml-4 h-px flex-grow bg-gradient-to-r from-[#A69076]/40 to-transparent"></div>
              </h3>
              <ul className="space-y-6">
                <li className="flex items-start space-x-4">
                  <span className="text-[#A69076] mt-1 font-bold">✓</span>
                  <div>
                    <h4 className="text-white font-bold mb-1">Passaporte Digital Imutável</h4>
                    <p className="text-gray-400 text-sm">Registro permanente via tecnologia blockchain. Impossível de ser alterado ou forjado.</p>
                  </div>
                </li>
                <li className="flex items-start space-x-4">
                  <span className="text-[#A69076] mt-1 font-bold">✓</span>
                  <div>
                    <h4 className="text-white font-bold mb-1">Procedência Acumulativa</h4>
                    <p className="text-gray-400 text-sm">A cada transação, o histórico da peça se fortalece, aumentando o prêmio e o valor percebido.</p>
                  </div>
                </li>
                <li className="flex items-start space-x-4">
                  <span className="text-[#A69076] mt-1 font-bold">✓</span>
                  <div>
                    <h4 className="text-white font-bold mb-1">Liquidez Imediata</h4>
                    <p className="text-gray-400 text-sm">Transações instantâneas. A confiança na autenticidade já está embarcada no token da peça.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TheLastroStandard;
