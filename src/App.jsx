import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Catalog from './pages/Catalog';
import ItemDetails from './pages/ItemDetails';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CreateItem from './pages/CreateItem';
import Passaporte from './pages/Passaporte';
import CategoriaTracking from './pages/CategoriaTracking';
import AdminVerify from './pages/AdminVerify';
import Notificacoes from './pages/Notificacoes';
import Wishlist from './pages/Wishlist';
import Lembretes from './pages/Lembretes';
import Avaliacoes from './pages/Avaliacoes';
import Transferencias from './pages/Transferencias';

const App = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/como-funciona" element={<HowItWorks />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/peca/:id" element={<ItemDetails />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/nova-peca" element={<CreateItem />} />
          <Route path="/submeter-peca" element={<CreateItem />} />

          {/* Consulta pública do Passaporte Digital */}
          <Route path="/passaporte/:identifier" element={<Passaporte />} />

          {/* Acompanhamento de Categorias */}
          <Route path="/categorias-rastreadas" element={<CategoriaTracking />} />
          <Route path="/rastreamento" element={<CategoriaTracking />} />
          <Route path="/tracking" element={<CategoriaTracking />} />

          {/* Curadoria e Homologação da Loja */}
          <Route path="/admin/verificacao" element={<AdminVerify />} />
          <Route path="/verificacao" element={<AdminVerify />} />

          {/* Central de Notificações */}
          <Route path="/notificacoes" element={<Notificacoes />} />

          {/* Acervo e Gestão do Colecionador */}
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/lembretes" element={<Lembretes />} />
          <Route path="/avaliacoes" element={<Avaliacoes />} />
          <Route path="/transferencias" element={<Transferencias />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
