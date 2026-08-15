import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const links = {
    platform: [
      { name: 'Collection', path: '/catalog' },
      { name: 'How it Works', path: '/how-it-works' },
      { name: 'Sell with Us', path: '#' },
      { name: 'For Experts', path: '#' },
    ],
    support: [
      { name: 'Private Access', path: '#' },
      { name: 'FAQ', path: '#' },
      { name: 'Escrow Terms', path: '#' },
      { name: 'Privacy Policy', path: '#' },
    ],
    contact: {
      email: 'concierge@lastro.com',
      phone: '+1 (555) 123-4567',
      socials: [
        { name: 'IN', path: '#' },
        { name: 'IG', path: '#' },
      ]
    }
  };

  return (
    <footer className="bg-[#050505] border-t border-[#A69076]/20 py-12 px-4 md:px-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        {/* Brand */}
        <div className="col-span-1 md:col-span-1">
          <div className="flex flex-col justify-center items-start mb-4">
            <h1 className="text-white text-lg tracking-[0.3em] uppercase font-serif leading-tight">LASTRO</h1>
            <span className="text-gray-500 text-[9px] tracking-[0.3em] uppercase mt-0.5">ART / DESIGN / LUXURY</span>
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mt-4 pr-4">
            The new standard in curation and authentication for rare assets, securing value and history through the Lastro Digital Passport.
          </p>
        </div>

        {/* Links */}
        <div>
          <h4 className="text-white text-xs tracking-[0.2em] uppercase mb-4 font-serif">Platform</h4>
          <ul className="space-y-2">
            {links.platform.map((link, idx) => (
              <li key={idx}>
                {link.path.startsWith('/') ? (
                  <Link to={link.path} className="text-xs text-gray-500 hover:text-[#A69076] transition-colors">{link.name}</Link>
                ) : (
                  <a href={link.path} className="text-xs text-gray-500 hover:text-[#A69076] transition-colors">{link.name}</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 className="text-white text-xs tracking-[0.2em] uppercase mb-4 font-serif">Support</h4>
          <ul className="space-y-2">
            {links.support.map((link, idx) => (
              <li key={idx}>
                <a href={link.path} className="text-xs text-gray-500 hover:text-[#A69076] transition-colors">{link.name}</a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-white text-xs tracking-[0.2em] uppercase mb-4 font-serif">Contact</h4>
          <p className="text-xs text-gray-500 mb-2">{links.contact.email}</p>
          <p className="text-xs text-gray-500 mb-6">{links.contact.phone}</p>
          <div className="flex space-x-4">
            {links.contact.socials.map((social, idx) => (
              <a key={idx} href={social.path} className="text-gray-500 hover:text-[#A69076] transition-colors">{social.name}</a>
            ))}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center">
        <p className="text-[10px] text-gray-600 uppercase tracking-widest">&copy; {new Date().getFullYear()} Lastro. All rights reserved.</p>
        <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-4 md:mt-0">Design by Atelier Noir</p>
      </div>
    </footer>
  );
};

export default Footer;
