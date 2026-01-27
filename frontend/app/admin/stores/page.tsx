"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function StoresPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    chain_name: "",
    type: "retail" as "retail" | "wholesale",
    address: "",
    gps_latitude: "",
    gps_longitude: "",
    radius_meters: "50",
    shelf_layout_pdf_url: "",
    product_category: "",
    contacts: [] as Array<{ name: string; phone: string; role: string }>,
    logo_url: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "agency_admin")) {
      router.push("/admin/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);
      const storesData = await api.listStores();
      setStores(storesData);
    } catch (error) {
      console.error("Failed to load stores:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadStoreDetails(id: string) {
    try {
      const store = await api.getStore(id);
      setFormData({
        chain_name: store.chain_name || "",
        type: store.type || "retail",
        address: store.address || "",
        gps_latitude: store.gps_latitude?.toString() || "",
        gps_longitude: store.gps_longitude?.toString() || "",
        radius_meters: store.radius_meters?.toString() || "50",
        shelf_layout_pdf_url: store.shelf_layout_pdf_url || "",
        product_category: store.product_category || "",
        contacts: store.contacts || [],
        logo_url: store.logo_url || "",
      });
    } catch (error) {
      console.error("Failed to load store:", error);
    }
  }

  function handleEdit(store: any) {
    setEditing(store);
    loadStoreDetails(store.id);
    setShowForm(true);
  }

  function handleNew() {
    setEditing(null);
    setLogoFile(null);
    setFormData({
      chain_name: "",
      type: "retail",
      address: "",
      gps_latitude: "",
      gps_longitude: "",
      radius_meters: "50",
      shelf_layout_pdf_url: "",
      product_category: "",
      contacts: [],
      logo_url: "",
    });
    setShowForm(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Se estiver editando, fazer upload imediatamente
    if (editing) {
      try {
        setUploadingLogo(true);
        const result = await api.uploadStoreLogo(file, editing.id);
        setFormData({ ...formData, logo_url: result.url });
      } catch (error: any) {
        alert(error.message || "Failed to upload logo");
      } finally {
        setUploadingLogo(false);
      }
    } else {
      // Se estiver criando, armazenar o arquivo para upload após criação
      setLogoFile(file);
      // Criar preview temporário
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        gps_latitude: parseFloat(formData.gps_latitude),
        gps_longitude: parseFloat(formData.gps_longitude),
        radius_meters: parseInt(formData.radius_meters),
      };

      if (editing) {
        await api.updateStore(editing.id, submitData);
      } else {
        // Criar loja primeiro
        const newStore = await api.createStore(submitData) as any;
        
        // Se houver arquivo de logo, fazer upload após criação
        if (logoFile && newStore?.id) {
          try {
            setUploadingLogo(true);
            await api.uploadStoreLogo(logoFile, newStore.id);
          } catch (uploadError: any) {
            console.error('Failed to upload logo:', uploadError);
            // Não falhar o cadastro se o upload falhar
          } finally {
            setUploadingLogo(false);
          }
        }
      }
      setShowForm(false);
      setLogoFile(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || "Failed to save store");
    }
  }

  function addContact() {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: "", phone: "", role: "" }],
    });
  }

  function updateContact(index: number, field: string, value: string) {
    const newContacts = [...formData.contacts];
    newContacts[index] = { ...newContacts[index], [field]: value };
    setFormData({ ...formData, contacts: newContacts });
  }

  function removeContact(index: number) {
    setFormData({
      ...formData,
      contacts: formData.contacts.filter((_, i) => i !== index),
    });
  }

  async function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            gps_latitude: position.coords.latitude.toString(),
            gps_longitude: position.coords.longitude.toString(),
          });
        },
        (error) => {
          alert("Failed to get location: " + error.message);
        },
      );
    } else {
      alert("Geolocation is not supported by this browser.");
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

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-1">
              Lojas
            </h1>
            <p className="text-sm text-gray-500">
              Gerenciar lojas e localizações
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 px-4 py-2 rounded-lg border border-purple-100">
              <p className="text-xs text-gray-600 mb-0.5">Total de Lojas</p>
              <p className="text-2xl font-bold text-purple-600">
                {stores.length}
              </p>
            </div>
            <button
              onClick={handleNew}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Nova Loja
            </button>
          </div>
        </div>
      </div>
      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editing ? "Edit Store" : "New Store"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome da Rede
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.chain_name}
                    onChange={(e) =>
                      setFormData({ ...formData, chain_name: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.logo_url && (
                      <img
                        src={formData.logo_url.startsWith('data:') || formData.logo_url.startsWith('http') 
                          ? formData.logo_url 
                          : `${API_URL}${formData.logo_url}`}
                        alt="Logo"
                        className="w-20 h-20 object-contain border border-gray-300 rounded"
                      />
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="block text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {uploadingLogo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Enviando...
                        </p>
                      )}
                      {logoFile && !editing && (
                        <p className="text-xs text-green-600 mt-1">
                          Logo será enviado após criar a loja
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "retail" | "wholesale",
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      GPS Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.gps_latitude}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gps_latitude: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      GPS Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.gps_longitude}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          gps_longitude: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  📍 Use Current Location
                </button>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Radius (meters)
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.radius_meters}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          radius_meters: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Category
                    </label>
                    <input
                      type="text"
                      value={formData.product_category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          product_category: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Shelf Layout PDF URL
                  </label>
                  <input
                    type="url"
                    value={formData.shelf_layout_pdf_url}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shelf_layout_pdf_url: e.target.value,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contacts
                  </label>
                  {formData.contacts.map((contact, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={contact.name}
                        onChange={(e) =>
                          updateContact(index, "name", e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={contact.phone}
                        onChange={(e) =>
                          updateContact(index, "phone", e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="text"
                        placeholder="Role"
                        value={contact.role}
                        onChange={(e) =>
                          updateContact(index, "role", e.target.value)
                        }
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addContact}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Contact
                  </button>
                </div>
                <div className="flex space-x-2 pt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modern Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {stores.length === 0 ? (
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma loja encontrada
              </h3>
              <p className="text-gray-500 text-sm">
                Crie uma nova loja para começar
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-purple-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      Nome da Rede
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      Tipo
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-indigo-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Endereço
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      GPS
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                        />
                      </svg>
                      Raio
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {stores.map((store) => (
                  <tr
                    key={store.id}
                    className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm cursor-pointer transition-all duration-150 group border-b border-gray-50 hover:border-blue-200"
                  >
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {store.logo_url ? (
                          <img
                            src={`${API_URL}${store.logo_url}`}
                            alt={store.chain_name}
                            className="w-10 h-10 object-contain border border-gray-200 rounded group-hover:border-purple-300 transition-all"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                              const fallback =
                                target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className={`w-10 h-10 bg-gray-100 rounded flex items-center justify-center group-hover:bg-purple-100 transition-all ${store.logo_url ? "hidden" : ""}`}
                        >
                          <svg
                            className="w-6 h-6 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-purple-700 group-hover:font-semibold transition-all">
                          {store.chain_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors capitalize">
                        {store.type}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {store.address}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {store.gps_latitude?.toFixed(6)},{" "}
                        {store.gps_longitude?.toFixed(6)}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {store.radius_meters}m
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(store)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-all duration-200 group-hover:bg-blue-200 group-hover:text-blue-800 group-hover:shadow-sm"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span>Editar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
