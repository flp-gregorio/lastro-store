import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, CheckCircle, Clock } from 'lucide-react';

const EscrowModal = ({ isOpen, onClose, price }) => {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Conteúdo do Modal */}
      <div className="bg-[#0a0a0a] border border-[#A69076]/40 w-full max-w-2xl relative z-10 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Cabeçalho */}
        <div className="border-b border-[#A69076]/20 p-6 flex justify-between items-center bg-[#141414]">
          <div className="flex items-center gap-3">
            <Lock className="text-[#A69076]" size={20} />
            <h2 className="text-xl font-serif text-white">Proposta com Custódia Protegida (Escrow)</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className="p-6 overflow-y-auto">
          {confirmed ? (
            <div className="py-8 text-center space-y-4">
              <CheckCircle className="text-emerald-400 mx-auto" size={40} />
              <h3 className="text-2xl font-serif text-white">Proposta Registrada</h3>
              <p className="text-sm text-gray-400 font-sans max-w-md mx-auto leading-relaxed">
                Sua intenção de aquisição no valor de <span className="text-white font-medium">{price}</span> foi registrada com garantia de custódia Lastro. Nossa equipe entrará em contato para concluir os próximos passos.
              </p>
              <button
                onClick={() => {
                  setConfirmed(false);
                  onClose();
                }}
                className="mt-4 px-8 py-3 bg-[#A69076] text-black font-bold text-xs uppercase tracking-widest hover:bg-[#8c7860] transition-colors"
              >
                Concluir
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-300 leading-relaxed mb-8 font-sans">
                Você está prestes a iniciar uma negociação de alto valor. Para a proteção do comprador e do vendedor, utilizamos o sistema de <strong className="text-[#A69076]">Custódia Protegida (Escrow)</strong>.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1">
                    <CheckCircle className="text-[#A69076]" size={20} />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1 font-sans">1. Retenção Segura de Valores</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      Após a confirmação, o valor de <span className="text-white">{price}</span> permanece reservado em conta neutra de custódia. O vendedor é notificado da reserva, mas ainda não recebe o repasse financeiro.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1">
                    <Clock className="text-[#A69076]" size={20} />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1 font-sans">2. Logística Segurada e Conferência</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      A peça é transportada com seguro integral. Após o recebimento, você dispõe de um prazo de conferência (48 horas) para atestar a conformidade com o laudo do Passaporte Digital.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="mt-1">
                    <Lock className="text-[#A69076]" size={20} />
                  </div>
                  <div>
                    <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1 font-sans">3. Liberação ao Proprietário</h4>
                    <p className="text-xs text-gray-400 leading-relaxed font-sans">
                      Somente após a sua confirmação de recebimento e autenticidade o valor é liberado ao vendedor. Havendo qualquer divergência documental ou técnica, o valor é integralmente estornado.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Rodapé */}
        {!confirmed && (
          <div className="border-t border-[#A69076]/20 p-6 bg-[#141414] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-500 max-w-xs font-sans">
              Ao prosseguir, você concorda com as regras descritas em{' '}
              <Link to="/como-funciona" onClick={onClose} className="text-[#A69076] hover:underline">
                Como Funciona a Custódia Lastro
              </Link>.
            </p>
            <div className="flex gap-4 w-full md:w-auto">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-600 text-gray-300 text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors w-full md:w-auto font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={() => setConfirmed(true)}
                className="px-6 py-3 bg-[#A69076] text-black font-bold text-xs uppercase tracking-widest hover:bg-[#8c7860] transition-colors w-full md:w-auto font-sans cursor-pointer"
              >
                Confirmar Proposta
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default EscrowModal;
