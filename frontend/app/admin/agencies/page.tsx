'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function AdminAgenciesPage() {
  const { user, loading: authLoading, selectedAgencyId, setSelectedAgencyId } = useAuth();
  const router = useRouter();
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
      return;
    }
    if (user && user.role !== 'system_admin') {
      router.push('/admin/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'system_admin') {
      api
        .listAgencies()
        .then((data: any) => setAgencies(Array.isArray(data) ? data : []))
        .catch(() => setAgencies([]))
        .finally(() => setLoading(false));
    }
  }, [user?.role]);

  if (authLoading || (user && user.role !== 'system_admin')) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agências</h1>
        <p className="mt-1 text-gray-600">
          Selecione uma agência para visualizar e gerenciar seus dados no painel.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : agencies.length === 0 ? (
        <p className="text-gray-500">Nenhuma agência cadastrada.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => (
            <li key={agency.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedAgencyId(agency.id);
                  router.push('/admin/dashboard');
                }}
                className={`w-full rounded-lg border p-4 text-left shadow-sm transition ${
                  selectedAgencyId === agency.id
                    ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium text-gray-900">{agency.name}</span>
                {selectedAgencyId === agency.id && (
                  <span className="ml-2 text-sm text-blue-600">(selecionada)</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-gray-500">
        <Link href="/admin/dashboard" className="text-blue-600 hover:underline">
          Voltar ao dashboard
        </Link>
      </p>
    </div>
  );
}
