import React from 'react';
import { ShieldCheck, UserCheck, FileText, Activity } from 'lucide-react';

const PassportBadge = ({ expert, passport }) => {
  return (
    <div className="bg-[#141414] border border-[#A69076]/20 p-6 md:p-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 text-[#A69076]/5">
        <ShieldCheck size={180} strokeWidth={1} />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6 border-b border-[#A69076]/20 pb-4">
          <ShieldCheck className="text-[#A69076]" size={24} />
          <h3 className="text-lg font-serif text-[#A69076]">Passaporte Digital Lastro</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-start gap-3">
              <UserCheck className="text-gray-500 mt-0.5" size={16} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Perito Responsável</p>
                <p className="text-sm text-gray-200">{expert.name}</p>
                <p className="text-xs text-gray-400 mt-1">{expert.institution}</p>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-start gap-3">
              <FileText className="text-gray-500 mt-0.5" size={16} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Registro Imutável</p>
                <p className="text-sm font-mono text-gray-200 truncate">{passport.blockchainTx}</p>
                <p className="text-xs text-gray-400 mt-1">Autenticado e permanente</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 pt-4 mt-2 border-t border-[#A69076]/10">
            <div className="flex items-start gap-3">
              <Activity className="text-[#A69076] mt-0.5" size={16} />
              <div>
                <p className="text-[10px] text-[#A69076] uppercase tracking-widest mb-1">Status de Custódia</p>
                <p className="text-sm text-gray-200">Verificado fisicamente em {passport.issueDate}</p>
                <span className="text-xs text-[#A69076] mt-2 inline-block">Laudo Técnico Arquivado no Passaporte</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassportBadge;
