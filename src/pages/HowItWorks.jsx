import React from 'react';
import { Link } from 'react-router-dom';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Curadoria Rigorosa',
      description: 'Nossa coleção é construída com critério. Selecionamos exclusivamente peças que possuem relevância histórica, estado de conservação excepcional ou procedência comprovada.'
    },
    {
      number: '02',
      title: 'Perícia e Passaporte Digital',
      description: 'Cada peça submetida passa pela análise da nossa rede de peritos credenciados. O laudo técnico resulta em um Passaporte Digital imutável que acompanha a peça ao longo de toda a sua trajetória.'
    },
    {
      number: '03',
      title: 'Custódia Financeira (Escrow)',
      description: 'Para garantir a tranquilidade de ambas as partes, os valores da negociação são retidos em conta de custódia neutra até a conferência de autenticidade e conformidade.'
    },
    {
      number: '04',
      title: 'Logística Segurada',
      description: 'O transporte de peças de alto valor é realizado por operadores especializados com seguro integral de ponta a ponta, concluindo o processo com a confirmação de recebimento.'
    }
  ];

  return (
    <div className="pt-24 pb-24 bg-[#0a0a0a]">
      <div className="container mx-auto px-4 md:px-8">

        {/* Cabeçalho */}
        <div className="mb-24 mt-12 max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-serif mb-6 leading-tight text-white">
            A confiança não se pede.<br />
            <span className="text-[#A69076]">Prova-se.</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed font-sans">
            A Lastro nasceu para eliminar a assimetria de informação na negociação de bens raros e colecionáveis. Nosso modelo substitui promessas por processos auditáveis, perícia especializada e custódia segura.
          </p>
        </div>

        {/* Etapas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 mb-32">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <span className="absolute -top-10 -left-6 text-7xl font-serif font-bold text-white/5 select-none">{step.number}</span>
              <div className="relative z-10">
                <h3 className="text-xl font-serif mb-4 text-[#A69076]">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed font-sans">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Chamada para Ação */}
        <div className="bg-[#141414] border border-[#A69076]/20 p-12 text-center rounded">
          <h2 className="text-2xl font-serif mb-4 text-white">Possui uma peça para nossa curadoria?</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-2xl mx-auto font-sans">
            Se você é colecionador ou representante comercial e deseja certificar a autenticidade e a procedência de um item para o acervo, inicie o processo de submissão.
          </p>
          <Link
            to="/dashboard/nova-peca"
            className="inline-block bg-[#A69076] text-black font-bold px-8 py-3 text-xs font-sans uppercase tracking-widest hover:bg-[#8c7860] transition-colors"
          >
            Solicitar Avaliação
          </Link>
        </div>

      </div>
    </div>
  );
};

export default HowItWorks;
