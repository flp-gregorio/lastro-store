import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const links = {
    platform: [
      { name: 'Catálogo de Peças', path: '/catalogo' },
      { name: 'Como Funciona', path: '/como-funciona' },
      { name: 'Submeter Peça', path: '/dashboard/nova-peca' },
      { name: 'Categorias de Interesse', path: '/categorias-rastreadas' },
    ],
    support: [
      { name: 'Acesso Privado', path: '/login' },
      { name: 'Painel do Colecionador', path: '/dashboard' },
      { name: 'Central de Notificações', path: '/notificacoes' },
      { name: 'Lista de Desejos', path: '/wishlist' },
    ],
    contact: {
      email: 'concierge@lastro.com.br',
      phone: '+55 (11) 3090-4567',
      socials: [
        { name: 'LinkedIn', path: '/como-funciona' },
        { name: 'Instagram', path: '/catalogo' },
      ]
    }
  };

  return (
    <footer className="bg-[#050505] border-t border-[#A69076]/20 py-12 px-4 md:px-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        {/* Marca */}
        <div className="col-span-1 md:col-span-1">
          <div className="flex flex-col justify-center items-start mb-4">
            <h1 className="text-white text-lg tracking-[0.3em] uppercase font-serif leading-tight">LASTRO</h1>
            <span className="text-gray-500 text-[9px] tracking-[0.3em] uppercase mt-0.5">ARTE / DESIGN / ALTA RELOJOARIA</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mt-4 pr-4 font-sans">
            O novo padrão em curadoria e autenticação para ativos raros, preservando valor e procedência por meio do Passaporte Digital Lastro.
          </p>
        </div>

        {/* Plataforma */}
        <div>
          <h4 className="text-white text-xs tracking-[0.2em] uppercase mb-4 font-serif">Plataforma</h4>
          <ul className="space-y-2">
            {links.platform.map((link, idx) => (
              <li key={idx}>
                <Link to={link.path} className="text-xs text-gray-500 hover:text-[#A69076] transition-colors font-sans">{link.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Acesso e Suporte */}
        <div>
          <h4 className="text-white text-xs tracking-[0.2em] uppercase mb-4 font-serif">Acesso &amp; Suporte</h4>
          <ul className="space-y-2">
            {links.support.map((link, idx) => (
              <li key={idx}>
                <Link to={link.path} className="text-xs text-gray-500 hover:text-[#A69076] transition-colors font-sans">{link.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contato */}
        <div>
          <h4 className="text-white text-xs tracking-[0.2em] uppercase mb-4 font-serif">Contato</h4>
          <p className="text-xs text-gray-500 mb-2 font-sans">{links.contact.email}</p>
          <p className="text-xs text-gray-500 mb-6 font-sans">{links.contact.phone}</p>
          <div className="flex space-x-4">
            {links.contact.socials.map((social, idx) => (
              <Link key={idx} to={social.path} className="text-xs text-gray-500 hover:text-[#A69076] transition-colors font-sans">{social.name}</Link>
            ))}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest font-sans">&copy; {new Date().getFullYear()} Lastro. Todos os direitos reservados.</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-4 md:mt-0 font-sans">Curadoria Atelier Noir</p>
      </div>
    </footer>
  );
};

export default Footer;
