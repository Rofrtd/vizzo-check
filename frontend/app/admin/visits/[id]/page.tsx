'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

// Dynamically import map component to avoid SSR issues
const VisitMap = dynamic(() => import('@/components/VisitMap'), { ssr: false });

export default function VisitDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const visitId = params.id as string;
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agency_admin')) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && visitId) {
      loadVisit();
    }
  }, [user, visitId]);

  async function loadVisit() {
    try {
      setLoading(true);
      const data = await api.getVisit(visitId);
      setVisit(data);
      setNotes(data.notes || '');
    } catch (error) {
      console.error('Failed to load visit:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await api.updateVisit(visitId, { notes });
      setEditing(false);
      await loadVisit();
    } catch (error) {
      console.error('Failed to update visit:', error);
      alert('Falha ao atualizar visita');
    }
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

  if (!visit) {
    return <div className="p-8">Visita não encontrada</div>;
  }

  return (
    <>
          <div className="mb-6">
            <a href="/admin/visits" className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block">← Voltar para Visitas</a>
            <h1 className="text-3xl font-bold text-gray-900">Detalhes da Visita</h1>
          </div>
          {/* Visit Info */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left side - Visit Information */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Most Important: Promoter, Store, Brand */}
                  <div>
                    <label className="text-sm font-medium text-gray-500">Promotor</label>
                    <p className="text-lg font-semibold">{(visit.promoter as any)?.name || 'N/D'}</p>
                    {(visit.promoter as any)?.phone && (
                      <p className="text-sm text-gray-500 mt-1">{(visit.promoter as any)?.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Loja</label>
                    <p className="text-lg font-semibold">{(visit.store as any)?.chain_name || 'N/A'}</p>
                    <p className="text-sm text-gray-500 mt-1">{(visit.store as any)?.address || ''}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marca</label>
                    <p className="text-lg font-semibold">{(visit.brand as any)?.name || 'N/D'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        visit.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {visit.status === 'completed' ? 'Concluída' : 'Editada'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Data e Hora</label>
                    <p className="text-sm">{new Date(visit.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                  {visit.gps_latitude && visit.gps_longitude && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Coordenadas GPS</label>
                      <p className="text-xs text-gray-600">
                        {visit.gps_latitude}, {visit.gps_longitude}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Map */}
              {visit.gps_latitude && visit.gps_longitude && (
                <div className="lg:col-span-1">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Localização da Visita</label>
                  <VisitMap
                    visitLat={parseFloat(visit.gps_latitude)}
                    visitLng={parseFloat(visit.gps_longitude)}
                    storeLat={visit.store?.gps_latitude ? parseFloat(visit.store.gps_latitude) : null}
                    storeLng={visit.store?.gps_longitude ? parseFloat(visit.store.gps_longitude) : null}
                    storeRadius={visit.store?.radius_meters || null}
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Observações</label>
              {editing ? (
                <div className="mt-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Adicione observações sobre esta visita..."
                  />
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setNotes(visit.notes || '');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-gray-900">{visit.notes || 'Sem observações'}</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Produtos</h2>
            <div className="space-y-6">
              {visit.products && visit.products.length > 0 ? (
                visit.products.map((vp: any) => {
                  const product = vp.product as any;
                  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                  const productPhotoUrl = product?.photo_url 
                    ? (product.photo_url.startsWith('http') 
                        ? product.photo_url 
                        : `${API_URL}${product.photo_url}`)
                    : null;

                  return (
                  <div key={vp.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start space-x-4">
                        {/* Product Image */}
                        {productPhotoUrl ? (
                          <div className="flex-shrink-0">
                            <img
                              src={productPhotoUrl}
                              alt={product?.name || 'Produto'}
                              className="w-24 h-24 object-cover rounded border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-24 h-24 bg-gray-100 rounded border flex items-center justify-center">
                            <span className="text-xs text-gray-400">No image</span>
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-lg">{product?.name || 'Unknown Product'}</h3>
                          <p className="text-sm text-gray-500">Código: {product?.code || 'N/D'}</p>
                          <p className="text-sm text-gray-500 mt-1">{product?.description || ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Quantidade em Estoque</p>
                        <p className="text-2xl font-bold">{vp.quantity}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">Antes</label>
                        {vp.photo_before_url ? (
                          <img
                            src={vp.photo_before_url.startsWith('http') 
                              ? vp.photo_before_url 
                              : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${vp.photo_before_url}`}
                            alt="Antes"
                            className="w-full h-48 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                            Sem foto
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">Depois</label>
                        {vp.photo_after_url ? (
                          <img
                            src={vp.photo_after_url.startsWith('http') 
                              ? vp.photo_after_url 
                              : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${vp.photo_after_url}`}
                            alt="Depois"
                            className="w-full h-48 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                            Sem foto
                          </div>
                        )}
                      </div>
                    </div>
                    {vp.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <label className="text-sm font-medium text-gray-500 block mb-1">Observações do Produto</label>
                        <p className="text-sm text-gray-700">{vp.notes}</p>
                      </div>
                    )}
                  </div>
                );
                })
              ) : (
                <p className="text-gray-500">Nenhum produto nesta visita</p>
              )}
            </div>
          </div>
    </>
  );
}
