'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

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
      alert('Failed to update visit');
    }
  }

  if (authLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!visit) {
    return <div className="p-8">Visit not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/visits" className="text-blue-600">← Back to Visits</a>
              <h1 className="text-xl font-bold">Visit Details</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Visit Info */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Date & Time</label>
                <p className="text-lg">{new Date(visit.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    visit.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {visit.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Promoter</label>
                <p className="text-lg">{(visit.promoter as any)?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Store</label>
                <p className="text-lg">{(visit.store as any)?.chain_name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{(visit.store as any)?.address || ''}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Brand</label>
                <p className="text-lg">{(visit.brand as any)?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">GPS Coordinates</label>
                <p className="text-sm">{visit.gps_latitude}, {visit.gps_longitude}</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-500">Notes</label>
              {editing ? (
                <div className="mt-2">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                  />
                  <div className="mt-2 space-x-2">
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setNotes(visit.notes || '');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-gray-900">{visit.notes || 'No notes'}</p>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Products</h2>
            <div className="space-y-6">
              {visit.products && visit.products.length > 0 ? (
                visit.products.map((vp: any) => (
                  <div key={vp.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{(vp.product as any)?.name || 'Unknown Product'}</h3>
                        <p className="text-sm text-gray-500">Code: {(vp.product as any)?.code || 'N/A'}</p>
                        <p className="text-sm text-gray-500 mt-1">{(vp.product as any)?.description || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Quantity</p>
                        <p className="text-2xl font-bold">{vp.quantity}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">Before</label>
                        {vp.photo_before_url ? (
                          <img
                            src={vp.photo_before_url.startsWith('http') 
                              ? vp.photo_before_url 
                              : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${vp.photo_before_url}`}
                            alt="Before"
                            className="w-full h-48 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                            No photo
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500 block mb-2">After</label>
                        {vp.photo_after_url ? (
                          <img
                            src={vp.photo_after_url.startsWith('http') 
                              ? vp.photo_after_url 
                              : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${vp.photo_after_url}`}
                            alt="After"
                            className="w-full h-48 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-100 rounded border flex items-center justify-center text-gray-400">
                            No photo
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No products in this visit</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
