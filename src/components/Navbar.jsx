import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, X, User, Heart, Clock, Bell, ShieldCheck, Tag } from 'lucide-react';
import { apiUrl, getCurrentUserId, getCurrentUser } from '../api';

const CATEGORIES = [
  'ARTE',
  'COLECIONÁVEIS',
  'MOBILIÁRIO',
  'RELÓGIOS',
  'AUTOMOTIVO',
  'JOIAS',
  'DIVERSOS'
];

const Navbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkUser = () => {
      setUser(getCurrentUser());
    };
    checkUser();
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, [location.pathname]);

  const isStoreRep =
    user?.role === 'EquipeLastro' ||
    user?.role === 'RepresentanteLoja' ||
    user?.role === 'Loja' ||
    user?.role === 'Admin';

  const fetchUnreadNotifications = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId || userId === 'anon_user') {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await fetch(
        apiUrl(`/api/notificacoes?userId=${encodeURIComponent(userId)}&lida=false&limit=50`)
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n) => !n.lida).length);
        }
      }
    } catch {
      // silent fallback
    }
  }, []);

  useEffect(() => {
    fetchUnreadNotifications();
  }, [location.pathname, fetchUnreadNotifications]);

  useEffect(() => {
    const handleNotificationsUpdated = () => {
      fetchUnreadNotifications();
    };
    window.addEventListener('lastro:notifications-updated', handleNotificationsUpdated);
    const intervalId = setInterval(fetchUnreadNotifications, 8000);
    return () => {
      window.removeEventListener('lastro:notifications-updated', handleNotificationsUpdated);
      clearInterval(intervalId);
    };
  }, [fetchUnreadNotifications]);

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
          <div className="flex items-center space-x-3 md:space-x-4">
            {/* Search Trigger Button */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="text-white hover:text-[#A69076] transition-colors duration-300 p-1"
              title="Buscar no acervo"
              aria-label="Abrir barra de busca"
            >
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </button>

            {/* Categorias de Interesse */}
            <Link
              to="/categorias-rastreadas"
              className="text-gray-300 hover:text-[#A69076] hidden xl:flex items-center gap-1.5 transition-colors px-2 py-1 text-[11px] uppercase tracking-wider font-sans"
              title="Acompanhamento de Categorias"
            >
              <Tag className="w-3.5 h-3.5 text-[#A69076]" />
              Interesses
            </Link>

            {/* Curadoria (Representante da Loja) */}
            {isStoreRep && (
              <Link
                to="/admin/verificacao"
                className="hidden md:flex items-center gap-1.5 bg-[#A69076]/20 border border-[#A69076]/60 text-[#A69076] hover:bg-[#A69076] hover:text-black transition-colors px-2.5 py-1 text-[10px] md:text-xs uppercase tracking-wider font-sans font-semibold rounded"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Curadoria
              </Link>
            )}

            {/* Profile / Private Access Link */}
            <Link
              to="/dashboard"
              className="text-white hover:text-[#A69076] hidden md:block transition-colors duration-300 p-1"
              title="Painel"
            >
              <User className="h-4 w-4 md:h-5 md:w-5" />
            </Link>

            {/* Lista de Desejos */}
            <Link
              to="/wishlist"
              className="text-white hover:text-[#A69076] hidden md:block transition-colors duration-300 p-1"
              title="Lista de Desejos"
            >
              <Heart className="h-4 w-4 md:h-5 md:w-5" />
            </Link>

            {/* Lembretes */}
            <Link
              to="/lembretes"
              className="text-white hover:text-[#A69076] hidden md:block transition-colors duration-300 p-1"
              title="Lembretes de Conservação"
            >
              <Clock className="h-4 w-4 md:h-5 md:w-5" />
            </Link>

            {/* Notificações com sino tremendo e bolinha com contagem */}
            <Link
              to="/notificacoes"
              className="relative text-white hover:text-[#A69076] transition-colors duration-300 p-1 flex flex-col items-center"
              title={unreadCount > 0 ? `${unreadCount} notificação(ões) não lida(s)` : 'Notificações'}
            >
              <Bell
                className={[
                  'h-4 w-4 md:h-5 md:w-5',
                  unreadCount > 0 ? 'animate-bell-shake text-[#A69076]' : ''
                ].join(' ')}
              />
              {unreadCount > 0 && (
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 min-w-[16px] h-[16px] px-1 rounded-full bg-[#A69076] text-black font-sans font-bold text-[9px] leading-[16px] text-center shadow-md">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            {user ? (
              <Link
                to="/dashboard"
                className="border border-[#A69076] text-[#A69076] px-3 py-1.5 text-[10px] md:text-xs tracking-widest uppercase hover:bg-[#A69076] hover:text-black transition-colors duration-300 font-sans truncate max-w-[120px]"
              >
                {user.name?.split(' ')[0] || 'PAINEL'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="border border-[#A69076] text-[#A69076] px-3 py-1.5 md:px-5 md:py-2 text-[10px] md:text-xs tracking-widest uppercase hover:bg-[#A69076] hover:text-black transition-colors duration-300 font-sans"
              >
                ACESSO PRIVADO
              </Link>
            )}

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
                  placeholder="Pesquisar por Relógios, Arte, Joias, perito ou código do passaporte..."
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
            <div className="space-y-3 pb-4 border-b border-gray-800">
              <Link
                to="/catalogo"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-white hover:text-[#A69076] text-sm uppercase tracking-widest font-sans"
              >
                Catálogo Completo
              </Link>
              <Link
                to="/categorias-rastreadas"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-[#A69076] text-sm uppercase tracking-widest font-sans"
              >
                Categorias de Interesse
              </Link>
              <Link
                to="/wishlist"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-white hover:text-[#A69076] text-sm uppercase tracking-widest font-sans"
              >
                Lista de Desejos
              </Link>
              <Link
                to="/lembretes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-white hover:text-[#A69076] text-sm uppercase tracking-widest font-sans"
              >
                Lembretes de Conservação
              </Link>
              <Link
                to="/notificacoes"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-white hover:text-[#A69076] text-sm uppercase tracking-widest font-sans"
              >
                Notificações {unreadCount > 0 ? `(${unreadCount})` : ''}
              </Link>
              <Link
                to="/dashboard/nova-peca"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-white hover:text-[#A69076] text-sm uppercase tracking-widest font-sans"
              >
                Submeter Peça à Curadoria
              </Link>
              {isStoreRep && (
                <Link
                  to="/admin/verificacao"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-[#A69076] text-sm uppercase tracking-widest font-sans font-semibold"
                >
                  Painel de Curadoria
                </Link>
              )}
            </div>

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
