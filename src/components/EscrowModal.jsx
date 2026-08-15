import React from 'react';
import { Lock, CheckCircle, Clock } from 'lucide-react';

const EscrowModal = ({ isOpen, onClose, price }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="bg-[#0a0a0a] border border-[#A69076]/40 w-full max-w-2xl relative z-10 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="border-b border-[#A69076]/20 p-6 flex justify-between items-center bg-[#141414]">
          <div className="flex items-center gap-3">
            <Lock className="text-[#A69076]" size={20} />
            <h2 className="text-xl font-serif">Retained Payment Proposal (Escrow)</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          <p className="text-sm text-gray-300 leading-relaxed mb-8">
            You are about to initiate a high-value transaction. For your security and the seller's, we use an <strong className="text-[#A69076]">Escrow</strong> system.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="mt-1">
                <CheckCircle className="text-[#A69076]" size={20} />
              </div>
              <div>
                <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1">1. Funds Retention</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Upon confirmation, the amount of <span className="text-white">{price}</span> will be transferred to a neutral custody account managed by our payment provider. The seller will be notified but <strong>will not receive the money yet</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1">
                <Clock className="text-[#A69076]" size={20} />
              </div>
              <div>
                <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1">2. Logistics and Verification</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  The piece will be transported by our insured logistics. You will have a timeframe (e.g., 48h) after receipt to verify if the piece exactly matches the Digital Passport Appraisal.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="mt-1">
                <Lock className="text-[#A69076]" size={20} />
              </div>
              <div>
                <h4 className="text-white text-sm font-bold uppercase tracking-widest mb-1">3. Release</h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Only after your conformity confirmation (or the expiration of the timeframe without disputes), will the funds be released to the seller. If there are discrepancies, your money is safe for a refund.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#A69076]/20 p-6 bg-[#141414] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 max-w-xs">
            By proceeding, you agree to the <a href="#" className="text-[#A69076] hover:underline">Lastro Escrow Terms</a>.
          </p>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={onClose}
              className="px-6 py-3 border border-gray-600 text-gray-300 text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors w-full md:w-auto"
            >
              Cancel
            </button>
            <button 
              className="px-6 py-3 bg-[#A69076] text-black font-bold text-xs uppercase tracking-widest hover:bg-[#8c7860] transition-colors w-full md:w-auto"
            >
              Proceed to Payment
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EscrowModal;
