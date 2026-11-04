import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, User } from 'lucide-react';

const CATEGORIES = [
  'ARTE',
  'COLECIONÁVEIS',
  'MOBILIÁRIO',
  'RELÓGIOS',
  'AUTOMOTIVO',
  'DIVERSOS'
];

const Navbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/catalogo?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <nav className="bg-[#0a0a0a]/95 backdrop-blur-md border-b-[0.5px] border-[#A69076]/40 fixed w-full z-50 top-0">
        <div className="container mx-auto flex justify-between items-center px-4 md:px-8 py-3 md:py-4">
          {/* Left - Logo */}
          <Link to="/" className="flex items-center space-x-3 md:space-x-4">
            <div className="flex flex-col justify-center items-center">
              <h1 className="text-white text-sm md:text-lg tracking-[0.3em] uppercase font-serif leading-tight tracking-wider antialiased">
                LASTRO
              </h1>
              <span className="text-gray-500 text-[8px] md:text-[9px] tracking-[0.3em] uppercase mt-0.5">
                ARTE / DESIGN / LUXO
              </span>
            </div>
          </Link>

          {/* Center - Category Filter Links */}
          <ul className="hidden lg:flex space-x-6 xl:space-x-8">
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <Link
                  to={`/catalogo?categoria=${encodeURIComponent(cat)}`}
                  className="text-white hover:text-[#A69076] uppercase text-xs tracking-[0.2em] transition-colors duration-300 font-sans"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right - Actions */}
          <div className="flex items-center space-x-4 md:space-x-5">
            {/* Search Trigger Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-white hover:text-[#A69076] transition-colors duration-300 p-1"
              title="Buscar no acervo"
              aria-label="Abrir barra de busca"
            >
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Profile / Private Access Link */}
            <Link
              to="/dashboard"
              className="text-white hover:text-[#A69076] hidden md:block transition-colors duration-300 p-1"
              title="Painel"
            >
              <User className="h-4 w-4 md:h-5 md:w-5" />
            </Link>

            <Link
              to="/login"
              className="border border-[#A69076] text-[#A69076] px-3 py-1.5 md:px-5 md:py-2 text-[10px] md:text-xs tracking-widest uppercase hover:bg-[#A69076] hover:text-black transition-colors duration-300 font-sans"
            >
              ACESSO PRIVADO
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white hover:text-[#A69076] lg:hidden transition-colors duration-300 p-1"
              aria-label="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dropdown Search Bar */}
        {isSearchOpen && (
          <div className="border-t border-[#1e1e1e] bg-[#0c0c0c] py-4 px-4 md:px-8 shadow-2xl transition-all">
            <div className="container mx-auto max-w-4xl">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por peça, categoria, perito ou código do passaporte..."
                  className="w-full bg-[#141414] border border-[#2a2a2a] text-white pl-12 pr-12 py-3 text-sm font-sans focus:outline-none focus:border-[#A69076] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-3 p-1 text-gray-500 hover:text-white transition-colors"
                  aria-label="Fechar busca"
                >
                  <X className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#1e1e1e] bg-[#0c0c0c] px-6 py-6 space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-sans">
              Categorias do Acervo
            </p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat}
                  to={`/catalogo?categoria=${encodeURIComponent(cat)}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-gray-300 hover:text-[#A69076] text-xs uppercase tracking-wider py-1 font-sans transition-colors"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;
