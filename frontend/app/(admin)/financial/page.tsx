'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function FinancialPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    groupBy: '' as '' | 'brand' | 'store' | 'city'
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agency_admin')) {
      router.push('/admin/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadReport();
    }
  }, [user, filters]);

  async function loadReport() {
    try {
      setLoading(true);
      const query: any = {};
      if (filters.startDate) query.startDate = filters.startDate;
      if (filters.endDate) query.endDate = filters.endDate;
      if (filters.groupBy) query.groupBy = filters.groupBy;
      
      const data = await api.getFinancialReport(query);
      setReport(data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: 'csv' | 'pdf') {
    try {
      const query: any = {};
      if (filters.startDate) query.startDate = filters.startDate;
      if (filters.endDate) query.endDate = filters.endDate;
      if (filters.groupBy) query.groupBy = filters.groupBy;
      
      await api.exportFinancialReport(format, query);
    } catch (error: any) {
      alert(error.message || 'Failed to export report');
    }
  }

  if (authLoading || loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/admin/dashboard" className="text-blue-600">← Dashboard</a>
              <h1 className="text-xl font-bold">Financial Reports</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                disabled
                title="PDF export coming soon"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={filters.groupBy}
                  onChange={(e) => setFilters({ ...filters, groupBy: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">None</option>
                  <option value="brand">Brand</option>
                  <option value="store">Store</option>
                  <option value="city">City</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {report && (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="text-sm font-medium text-gray-500">Total Visits</div>
                    <div className="mt-1 text-3xl font-semibold text-gray-900">
                      {report.total_visits || 0}
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="text-sm font-medium text-gray-500">Promoter Payments</div>
                    <div className="mt-1 text-3xl font-semibold text-gray-900">
                      ${(report.total_promoter_payments || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="text-sm font-medium text-gray-500">Brand Charges</div>
                    <div className="mt-1 text-3xl font-semibold text-gray-900">
                      ${(report.total_brand_charges || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="text-sm font-medium text-gray-500">Gross Margin</div>
                    <div className={`mt-1 text-3xl font-semibold ${
                      (report.gross_margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${(report.gross_margin || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Grouped Data Table */}
              {report.grouped_data && report.grouped_data.length > 0 && (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <h2 className="text-lg font-semibold p-6 border-b">
                    Grouped by {filters.groupBy}
                  </h2>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          {filters.groupBy === 'brand' ? 'Brand' : filters.groupBy === 'store' ? 'Store' : 'City'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Visits</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promoter Payments</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand Charges</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross Margin</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.grouped_data.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.group_key}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.visits}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.promoter_payments.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.brand_charges.toFixed(2)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                            item.gross_margin >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${item.gross_margin.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
