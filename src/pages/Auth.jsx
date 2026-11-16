import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../api';
import { ShieldCheck, UserCheck } from 'lucide-react';

const Auth = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Comprador');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const payload = isRegister
      ? { email, password, name, role }
      : { email, password };

    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro na requisição. Verifique suas informações.');
      }

      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userRole', data.user.role || 'Comprador');

        const isStoreRep =
          data.user.role === 'EquipeLastro' ||
          data.user.role === 'RepresentanteLoja' ||
          data.user.role === 'Loja' ||
          data.user.role === 'Admin';

        if (isRegister) {
          setSuccess('Conta criada com sucesso! Redirecionando...');
          setTimeout(() => {
            navigate(isStoreRep ? '/admin/verificacao' : '/dashboard');
          }, 800);
        } else {
          navigate(isStoreRep ? '/admin/verificacao' : '/dashboard');
        }
      } else {
        setSuccess('Acesso concedido. Redirecionando...');
        setTimeout(() => navigate('/dashboard'), 800);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 pb-16 px-4 bg-[#0a0a0a]">
      <div className="max-w-md w-full bg-[#111] border border-gray-800 p-8 shadow-2xl rounded-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-serif text-white tracking-wide">
            {isRegister ? 'Criar Nova Conta' : 'Acesso Privado'}
          </h2>
          <p className="text-gray-400 font-sans text-sm mt-2">
            {isRegister
              ? 'Cadastre-se na curadoria exclusiva da Lastro.'
              : 'Área exclusiva para colecionadores e representantes da loja.'}
          </p>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500/80 text-red-200 px-4 py-3 mb-6 font-sans text-xs text-center leading-relaxed">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/40 border border-emerald-500/80 text-emerald-200 px-4 py-3 mb-6 font-sans text-xs text-center leading-relaxed">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <>
              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                  Tipo de Conta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('Comprador')}
                    className={`py-2.5 px-3 border text-xs font-sans uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                      role === 'Comprador'
                        ? 'border-[#A69076] bg-[#A69076]/10 text-[#A69076]'
                        : 'border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Colecionador
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('EquipeLastro')}
                    className={`py-2.5 px-3 border text-xs font-sans uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
                      role === 'EquipeLastro'
                        ? 'border-[#A69076] bg-[#A69076]/10 text-[#A69076]'
                        : 'border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Representante da Loja
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              Senha (mínimo 6 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-sans uppercase tracking-widest text-xs font-semibold py-4 hover:bg-gray-200 transition-colors mt-6 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processando...' : isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800/80 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
            }}
            className="text-gray-400 hover:text-[#A69076] transition-colors font-sans text-xs uppercase tracking-widest"
          >
            {isRegister
              ? 'Já possui uma conta? Faça login'
              : 'Não tem cadastro? Crie sua conta'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
