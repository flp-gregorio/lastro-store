import React from 'react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Strict Curation',
      description: 'Our collection is built upon rejections. We only accept pieces that possess historical relevance, unique condition, or irrefutable provenance. A large catalog destroys the attribute that sustains the price.'
    },
    {
      number: '02',
      title: 'Appraisal and Digital Passport',
      description: 'Every admitted piece goes through the analysis of our network of accredited experts (gemologists, laboratories, art historians). The resulting appraisal is immutable and accompanies the piece throughout its life, not just during the transaction.'
    },
    {
      number: '03',
      title: 'Escrow Custody',
      description: 'To guarantee the security of both parties, the transaction funds are retained in a custody account. The seller is guaranteed that the buyer has the funds, and the buyer is guaranteed that the piece is authentic before release.'
    },
    {
      number: '04',
      title: 'Insured Logistics',
      description: 'The transportation of the piece is carried out by specialized high-value carriers, with end-to-end insurance. The final verification occurs upon receipt, closing the circle of trust.'
    }
  ];

  return (
    <div className="pt-24 pb-24 bg-[#0a0a0a]">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Header */}
        <div className="mb-24 mt-12 max-w-3xl">
          <h1 className="text-3xl md:text-5xl font-serif mb-6 leading-tight">Trust is not asked for.<br/><span className="text-[#A69076]">It is proven.</span></h1>
          <p className="text-gray-400 text-sm md:text-base leading-relaxed">
            Lastro was created to resolve the main friction in high-value asset transactions between private parties: information asymmetry. Our model replaces interpersonal trust with auditable processes, specialized appraisal, and financial custody.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 mb-32">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <span className="absolute -top-10 -left-6 text-7xl font-serif font-bold text-white/5">{step.number}</span>
              <div className="relative z-10">
                <h3 className="text-xl font-serif mb-4 text-[#A69076]">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to action */}
        <div className="bg-[#141414] border border-[#A69076]/20 p-12 text-center">
          <h2 className="text-2xl font-serif mb-4">Do you have a piece for the collection?</h2>
          <p className="text-gray-400 text-sm mb-8 max-w-2xl mx-auto">
            If you are an owner or industry professional and wish to prove the value of your piece for a sale without discount, start the curation process.
          </p>
          <button className="bg-[#A69076] text-black font-bold px-8 py-3 text-sm uppercase tracking-widest hover:bg-[#8c7860] transition-colors">
            Request Evaluation
          </button>
        </div>

      </div>
    </div>
  );
};

export default HowItWorks;
