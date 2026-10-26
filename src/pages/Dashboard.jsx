import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Settings, LogOut } from 'lucide-react';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-gray-800 pb-8">
        <div>
          <h1 className="text-4xl font-serif mb-2">Painel do Vendedor</h1>
          <p className="text-gray-400 font-sans text-sm">
            Bem-vindo de volta, <span className="text-white">{user.name}</span>.
          </p>
        </div>
        
        <div className="mt-6 md:mt-0 flex gap-4">
          <Link 
            to="/dashboard/nova-peca" 
            className="bg-white text-black px-6 py-2.5 font-sans uppercase tracking-widest text-xs font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nova Peça
          </Link>
          <button 
            onClick={handleLogout}
            className="border border-gray-700 text-gray-300 px-4 py-2.5 hover:border-white transition-colors flex items-center gap-2"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-[#111] border border-gray-800 p-6">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Suas Peças Ativas</h3>
          <p className="text-4xl font-serif text-white">0</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Em Revisão</h3>
          <p className="text-4xl font-serif text-white">0</p>
        </div>
        <div className="bg-[#111] border border-gray-800 p-6">
          <h3 className="text-gray-400 uppercase tracking-widest text-xs font-sans mb-4">Vendas Concluídas</h3>
          <p className="text-4xl font-serif text-white">0</p>
        </div>
      </div>

      <div className="text-center py-20 border border-dashed border-gray-800">
        <p className="text-gray-500 font-sans">Nenhuma peça cadastrada ainda.</p>
        <Link to="/dashboard/nova-peca" className="inline-block mt-4 text-[#A69076] hover:text-white transition-colors font-sans text-sm uppercase tracking-widest">
          Comece agora
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
