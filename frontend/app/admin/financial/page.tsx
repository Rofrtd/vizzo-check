"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type ReportType =
  | "summary"
  | "promoters"
  | "brands"
  | "stores"
  | "to-be-paid"
  | "to-be-received";

export default function FinancialPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ReportType>("summary");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  // Report data
  const [summaryReport, setSummaryReport] = useState<any>(null);
  const [promoterReport, setPromoterReport] = useState<any[]>([]);
  const [brandReport, setBrandReport] = useState<any[]>([]);
  const [storeReport, setStoreReport] = useState<any[]>([]);
  const [toBePaidReport, setToBePaidReport] = useState<any[]>([]);
  const [toBeReceivedReport, setToBeReceivedReport] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "agency_admin")) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, filters, activeTab]);

  async function loadReports() {
    try {
      setLoading(true);
      const query: any = {};
      if (filters.startDate) query.startDate = filters.startDate;
      if (filters.endDate) query.endDate = filters.endDate;

      // Load reports based on active tab
      if (activeTab === "summary") {
        const data = await api.getFinancialReport(query);
        setSummaryReport(data);
      } else if (activeTab === "promoters") {
        const data = await api.getPromoterReport(query);
        setPromoterReport(Array.isArray(data) ? data : []);
      } else if (activeTab === "brands") {
        const data = await api.getBrandReport(query);
        setBrandReport(Array.isArray(data) ? data : []);
      } else if (activeTab === "stores") {
        const data = await api.getStoreReport(query);
        setStoreReport(Array.isArray(data) ? data : []);
      } else if (activeTab === "to-be-paid") {
        const data = await api.getToBePaidReport(query);
        setToBePaidReport(Array.isArray(data) ? data : []);
      } else if (activeTab === "to-be-received") {
        const data = await api.getToBeReceivedReport(query);
        setToBeReceivedReport(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      console.error("Failed to load reports:", error);
      alert(error.message || "Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(amount);
  }

  const tabs = [
    { id: "summary" as ReportType, label: "Resumo Geral", icon: "📊" },
    { id: "promoters" as ReportType, label: "Por Promotor", icon: "👥" },
    { id: "brands" as ReportType, label: "Por Marca", icon: "🏷️" },
    { id: "stores" as ReportType, label: "Por Loja", icon: "🏪" },
    { id: "to-be-paid" as ReportType, label: "A Pagar", icon: "💸" },
    { id: "to-be-received" as ReportType, label: "A Receber", icon: "💰" },
  ];

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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Relatórios Financeiros
        </h1>
        <p className="text-gray-600 mt-1">
          Visualizar dados financeiros e exportar relatórios
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-6 py-4 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors
                  ${
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === "summary" && summaryReport && (
          <div className="p-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-lg border border-blue-200">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Total de Visitas
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {summaryReport.total_visits || 0}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-lg border border-green-200">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Pagamentos a Promotores
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(summaryReport.total_promoter_payments || 0)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-lg border border-purple-200">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Cobranças de Marcas
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(summaryReport.total_brand_charges || 0)}
                </div>
              </div>
              <div
                className={`p-5 rounded-lg border ${
                  (summaryReport.gross_margin || 0) >= 0
                    ? "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
                    : "bg-gradient-to-br from-red-50 to-red-100 border-red-200"
                }`}
              >
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Margem Bruta
                </div>
                <div
                  className={`text-3xl font-bold ${
                    (summaryReport.gross_margin || 0) >= 0
                      ? "text-emerald-700"
                      : "text-red-700"
                  }`}
                >
                  {formatCurrency(summaryReport.gross_margin || 0)}
                </div>
              </div>
            </div>

            {summaryReport.grouped_data &&
              summaryReport.grouped_data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Grupo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Visitas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Pagamentos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Cobranças
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Margem
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {summaryReport.grouped_data.map(
                        (item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.group_key}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.visits}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.promoter_payments)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.brand_charges)}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                                item.gross_margin >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(item.gross_margin)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        )}

        {activeTab === "promoters" && (
          <div className="p-6">
            {promoterReport.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">Nenhum dado encontrado</p>
                <p className="text-sm text-gray-400">
                  Verifique se há promotores ativos e visitas no período
                  selecionado
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Promotor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        E-mail
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Visitas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Valor por Visita
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total a Pagar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {promoterReport.map((item: any) => (
                      <tr key={item.promoter_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.promoter_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.promoter_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total_visits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(item.payment_per_visit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(item.total_payment)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "brands" && (
          <div className="p-6">
            {brandReport.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">Nenhum dado encontrado</p>
                <p className="text-sm text-gray-400">
                  Verifique se há marcas cadastradas e visitas no período
                  selecionado
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Marca
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Visitas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Preço por Visita
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total a Receber
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {brandReport.map((item: any) => (
                      <tr key={item.brand_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.brand_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total_visits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(item.price_per_visit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {formatCurrency(item.total_charge)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "stores" && (
          <div className="p-6">
            {storeReport.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">Nenhum dado encontrado</p>
                <p className="text-sm text-gray-400">
                  Verifique se há lojas cadastradas e visitas no período
                  selecionado
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Loja
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Endereço
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Visitas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Pagamentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Cobranças
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Margem
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {storeReport.map((item: any) => (
                      <tr key={item.store_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.store_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.store_address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total_visits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(item.total_promoter_payments)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(item.total_brand_charges)}
                        </td>
                        <td
                          className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                            item.gross_margin >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {formatCurrency(item.gross_margin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "to-be-paid" && (
          <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Pagamentos Pendentes</h3>
              <div className="text-sm text-gray-600">
                Total:{" "}
                <span className="font-bold text-gray-900">
                  {formatCurrency(
                    toBePaidReport.reduce(
                      (sum, item) => sum + item.total_amount,
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
            {toBePaidReport.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum pagamento pendente
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Promotor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        E-mail
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Telefone
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Visitas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Valor por Visita
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {toBePaidReport.map((item: any) => (
                      <tr key={item.promoter_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.promoter_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.promoter_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.promoter_phone || "N/D"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total_visits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(item.payment_per_visit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                          {formatCurrency(item.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "to-be-received" && (
          <div className="p-6">
            <div className="mb-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Cobranças Pendentes</h3>
              <div className="text-sm text-gray-600">
                Total:{" "}
                <span className="font-bold text-gray-900">
                  {formatCurrency(
                    toBeReceivedReport.reduce(
                      (sum, item) => sum + item.total_amount,
                      0,
                    ),
                  )}
                </span>
              </div>
            </div>
            {toBeReceivedReport.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhuma cobrança pendente
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Marca
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Visitas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Preço por Visita
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {toBeReceivedReport.map((item: any) => (
                      <tr key={item.brand_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.brand_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.total_visits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(item.price_per_visit)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(item.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
