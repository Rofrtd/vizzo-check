'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function EarningsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/promoter/login');
    } else if (user && user.role !== 'promoter') {
      router.push('/admin/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadEarnings();
    }
  }, [user]);

  async function loadEarnings() {
    try {
      setLoading(true);
      const data = await api.getMyEarnings();
      setEarnings(data);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(amount);
  }

  function getCurrentMonthName() {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  function getLastMonthName() {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !earnings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/promoter" className="text-blue-600 hover:text-blue-800">← Voltar</Link>
              <h1 className="text-xl font-bold">Meus Ganhos</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/promoter/visits" className="text-sm text-gray-700 hover:text-gray-900">Minhas Visitas</Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total de Ganhos</h3>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(earnings.total_earnings)}</p>
              <p className="text-sm text-gray-500 mt-2">{earnings.total_visits} visitas</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{getCurrentMonthName()}</h3>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(earnings.this_month.earnings)}</p>
              <p className="text-sm text-gray-500 mt-2">{earnings.this_month.visits} visitas</p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">{getLastMonthName()}</h3>
              <p className="text-3xl font-bold text-blue-600">{formatCurrency(earnings.last_month.earnings)}</p>
              <p className="text-sm text-gray-500 mt-2">{earnings.last_month.visits} visitas</p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold mb-4">Informações de Pagamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Pagamento por Visita</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {formatCurrency(earnings.payment_per_visit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total de Visitas Concluídas</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">
                  {earnings.total_visits}
                </p>
              </div>
            </div>
          </div>

          {/* Earnings by Brand */}
          {earnings.by_brand && earnings.by_brand.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Ganhos por Marca</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {earnings.by_brand.map((brand: any, index: number) => (
                  <div key={index} className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{brand.brandName}</h4>
                        <p className="text-sm text-gray-500 mt-1">{brand.visits} visitas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(brand.earnings)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatCurrency(earnings.payment_per_visit)} por visita
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {earnings.total_visits === 0 && (
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500 mb-4">Nenhuma visita concluída ainda</p>
              <Link href="/promoter" className="inline-block text-blue-600 hover:text-blue-800">
                Criar sua primeira visita →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
