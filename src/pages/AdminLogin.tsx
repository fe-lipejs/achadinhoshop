import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, ShoppingBag, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { STORE_NAME } from '../lib/utils';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const { session, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && session && isAdmin) return <Navigate to="/admin" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('E-mail ou senha inválidos.');
      setSubmitting(false);
      return;
    }
    const { data: admin } = await supabase.rpc('is_admin');
    if (!admin) {
      await supabase.auth.signOut();
      setError('Este usuário não tem permissão de administrador.');
      setSubmitting(false);
      return;
    }
    navigate('/admin', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-black">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center mb-6 text-gray-400 hover:text-black transition-colors">
          <ArrowLeft size={20} className="mr-1" /> Voltar para a loja
        </Link>
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center border-4 border-white shadow-sm">
            <ShoppingBag size={28} className="text-white" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-black">
          Painel {STORE_NAME}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Acesso exclusivo para lojistas e administradores
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100">
          {!isSupabaseConfigured && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm font-medium">
              Supabase não configurado. Verifique o arquivo .env
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700">
                E-mail
              </label>
              <div className="mt-1">
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700">
                Senha
              </label>
              <div className="mt-1">
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-black focus:border-black sm:text-sm transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-full shadow-sm text-sm font-bold text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-70 transition-colors"
              >
                {submitting ? 'Entrando...' : <><Lock size={16} className="mr-2" /> Entrar</>}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center text-[13px] text-gray-500">
            Ainda não tem acesso? Crie um usuário no <strong>Painel do Supabase</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
