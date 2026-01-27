'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import Toast from '@/components/Toast';

interface ProductData {
  product_id: string;
  name: string;
  code: string;
  quantity: number;
  photo_before: File | null;
  photo_after: File | null;
  photo_before_url: string | null;
  photo_after_url: string | null;
  notes: string;
}

export default function VisitCreation() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const storeId = params.storeId as string;
  const brandId = params.brandId as string;
  
  const [store, setStore] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [gps, setGps] = useState<{ latitude: number | null; longitude: number | null }>({ latitude: null, longitude: null });
  const [gpsError, setGpsError] = useState<string>('');
  const [gpsValidated, setGpsValidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/promoter/login');
    } else if (user && user.role !== 'promoter') {
      router.push('/admin/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && storeId && brandId) {
      loadData();
      getCurrentLocation();
    }
  }, [user, storeId, brandId]);

  async function loadData() {
    try {
      const [storeData, brandData] = await Promise.all([
        api.getStore(storeId),
        api.getBrand(brandId)
      ]);
      
      setStore(storeData);
      setBrand(brandData);
      
      // Initialize products
      const productData: ProductData[] = (brandData.products || []).map((product: any) => ({
        product_id: product.id,
        name: product.name,
        code: product.code,
        quantity: 0,
        photo_before: null,
        photo_after: null,
        photo_before_url: null,
        photo_after_url: null,
        notes: ''
      }));
      
      setProducts(productData);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      alert(error.message || 'Falha ao carregar loja ou marca');
      router.push('/promoter');
    } finally {
      setLoading(false);
    }
  }

  function getCurrentLocation() {
    if (!navigator.geolocation) {
      setGpsError('Geolocalização não é suportada pelo seu navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        validateGPS(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setGpsError('Falha ao obter localização: ' + error.message);
      }
    );
  }

  async function validateGPS(lat: number, lng: number) {
    if (!store) return;
    
    try {
      // Calculate distance using Haversine formula (simplified check)
      // For MVP, we'll validate on the backend, but show a warning here
      const distance = calculateDistance(
        lat,
        lng,
        parseFloat(store.gps_latitude),
        parseFloat(store.gps_longitude)
      );
      
      const radiusKm = (store.radius_meters || 50) / 1000;
      
      if (distance <= radiusKm) {
        setGpsValidated(true);
        setGpsError('');
      } else {
        setGpsValidated(false);
        setGpsError(`Você está a ${distance.toFixed(2)}km da loja. Por favor, aproxime-se.`);
      }
    } catch (error) {
      setGpsError('Falha ao validar GPS');
    }
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function handlePhotoChange(productIndex: number, type: 'before' | 'after', file: File | null) {
    const newProducts = [...products];
    if (file) {
      newProducts[productIndex][`photo_${type}`] = file;
      const url = URL.createObjectURL(file);
      newProducts[productIndex][`photo_${type}_url`] = url;
    }
    setProducts(newProducts);
  }

  function handleQuantityChange(productIndex: number, quantity: number) {
    const newProducts = [...products];
    newProducts[productIndex].quantity = quantity;
    setProducts(newProducts);
  }

  function handleNotesChange(productIndex: number, notes: string) {
    const newProducts = [...products];
    newProducts[productIndex].notes = notes;
    setProducts(newProducts);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!gps.latitude || !gps.longitude) {
      alert('Por favor, habilite os serviços de localização');
      return;
    }

    if (!gpsValidated) {
      alert('Por favor, aproxime-se da localização da loja');
      return;
    }

    // Validate all products have photos and stock quantities
    const incompleteProducts = products.filter(p => 
      !p.photo_before || !p.photo_after || p.quantity === null || p.quantity === undefined
    );

    if (incompleteProducts.length > 0) {
      alert('Por favor, complete todos os produtos: adicione foto antes, foto depois e quantidade em estoque para cada produto');
      return;
    }

    setSubmitting(true);

    try {
      // Create visit with empty photo URLs first
      const visitData = {
        store_id: storeId,
        brand_id: brandId,
        gps_latitude: gps.latitude,
        gps_longitude: gps.longitude,
        products: products.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity,
          photo_before: '', // Will be uploaded and updated
          photo_after: '', // Will be uploaded and updated
          notes: p.notes || null
        }))
      };

      const visit = await api.createVisit(visitData);

      // Upload photos and update visit_products
      for (const product of products) {
        if (product.photo_before && product.photo_after) {
          // Upload photos
          const [beforeResult, afterResult] = await Promise.all([
            api.uploadPhoto(product.photo_before, visit.id, product.product_id, 'before'),
            api.uploadPhoto(product.photo_after, visit.id, product.product_id, 'after')
          ]);

          // Update visit_products with photo URLs and notes
          await api.updateVisitProductPhotos(
            visit.id,
            product.product_id,
            beforeResult.url,
            afterResult.url,
            product.notes || null
          );
        }
      }

      setSubmitting(false);
      setToast({
        message: 'Visita criada com sucesso!',
        type: 'success',
        isVisible: true
      });
      
      // Redirect after a short delay to show the toast
      setTimeout(() => {
        router.push('/promoter');
      }, 2000);
    } catch (error: any) {
      console.error('Failed to create visit:', error);
      setSubmitting(false);
      setToast({
        message: error.message || 'Falha ao criar visita',
        type: 'error',
        isVisible: true
      });
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

  if (!user || !store || !brand) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/promoter/store/${storeId}/brand`)}
                className="text-sm text-gray-600 hover:text-gray-900 mr-4"
              >
                ← Voltar
              </button>
              <h1 className="text-xl font-bold">Criar Visita</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{brand.name}</h2>
            <p className="text-gray-600">
              Loja: <span className="font-semibold">{store.chain_name}</span>
            </p>
            <p className="text-sm text-gray-500">{store.address}</p>
          </div>

          {/* GPS Status */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h3 className="font-semibold mb-2">Localização</h3>
            {gps.latitude && gps.longitude ? (
              <div>
                <p className="text-sm text-gray-600">
                  GPS: {gps.latitude.toFixed(6)}, {gps.longitude.toFixed(6)}
                </p>
                {gpsValidated ? (
                  <p className="text-sm text-green-600 mt-1">✓ Localização validada</p>
                ) : (
                  <div>
                    <p className="text-sm text-red-600 mt-1">{gpsError || 'Localização não validada'}</p>
                    <button
                      onClick={getCurrentLocation}
                      className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                    >
                      Atualizar Localização
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Obtendo localização...</p>
                {gpsError && <p className="text-sm text-red-600 mt-1">{gpsError}</p>}
                <button
                  onClick={getCurrentLocation}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                >
                  Obter Localização
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Products */}
            <div className="space-y-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Produtos</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Para cada produto, adicione quantidade em estoque e fotos antes/depois
                </p>
              </div>
              {products.map((product, index) => (
                <div key={product.product_id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                  <div className="mb-3">
                    <h4 className="font-medium text-lg">{product.name}</h4>
                    {product.code && <p className="text-sm text-gray-500">Code: {product.code}</p>}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Before Photo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto Antes *
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Tire foto do produto antes do reposicionamento</p>
                      {product.photo_before_url ? (
                        <div className="mb-2">
                          <img
                            src={product.photo_before_url}
                            alt="Antes"
                            className="w-full h-32 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => handlePhotoChange(index, 'before', null)}
                            className="text-xs text-red-600 mt-1"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handlePhotoChange(index, 'before', file);
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          required
                        />
                      )}
                    </div>

                    {/* After Photo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Foto Depois *
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Tire foto do produto depois do reposicionamento</p>
                      {product.photo_after_url ? (
                        <div className="mb-2">
                          <img
                            src={product.photo_after_url}
                            alt="Depois"
                            className="w-full h-32 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => handlePhotoChange(index, 'after', null)}
                            className="text-xs text-red-600 mt-1"
                          >
                            Remover
                          </button>
                        </div>
                      ) : (
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handlePhotoChange(index, 'after', file);
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          required
                        />
                      )}
                    </div>
                  </div>

                  {/* Stock Quantity */}
                  <div className="mt-4 border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade em Estoque *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={product.quantity || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseInt(e.target.value) || 0;
                        handleQuantityChange(index, value);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Digite a quantidade atual em estoque (pode ser 0 se estiver sem estoque)</p>
                  </div>

                  {/* Notes per product */}
                  <div className="mt-4 border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observações (Opcional)
                    </label>
                    <textarea
                      value={product.notes}
                      onChange={(e) => handleNotesChange(index, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Adicione observações sobre este produto..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Submit */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={!gpsValidated || submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Enviando...' : 'Enviar Visita'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/promoter/store/${storeId}/brand`)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
