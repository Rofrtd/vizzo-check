"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function BrandsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    visit_frequency: "1",
    price_per_visit: "0",
    contacts: [] as Array<{ name: string; phone: string; role: string }>,
    store_ids: [] as string[],
    logo_url: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    code: "",
    description: "",
    photo_url: "",
  });
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
      const [brandsData, storesData] = await Promise.all([
        api.listBrands(),
        api.listStores(),
      ]);

      setBrands(brandsData);
      setStores(storesData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBrandDetails(id: string) {
    try {
      const brand = await api.getBrand(id);
      setSelectedBrand(brand);
      setFormData({
        name: brand.name || "",
        visit_frequency: brand.visit_frequency?.toString() || "1",
        price_per_visit: brand.price_per_visit?.toString() || "0",
        contacts: brand.contacts || [],
        store_ids: brand.stores?.map((s: any) => s.store_id) || [],
        logo_url: brand.logo_url || "",
      });
    } catch (error) {
      console.error("Failed to load brand:", error);
    }
  }

  function handleEdit(brand: any) {
    setEditing(brand);
    loadBrandDetails(brand.id);
    setShowForm(true);
  }

  function handleNew() {
    setEditing(null);
    setSelectedBrand(null);
    setLogoFile(null);
    setFormData({
      name: "",
      visit_frequency: "1",
      price_per_visit: "0",
      contacts: [],
      store_ids: [],
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
        const result = await api.uploadBrandLogo(file, editing.id);
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
      if (editing) {
        await api.updateBrand(editing.id, formData);
      } else {
        // Criar marca primeiro
        const newBrand = await api.createBrand(formData) as any;
        
        // Se houver arquivo de logo, fazer upload após criação
        if (logoFile && newBrand?.id) {
          try {
            setUploadingLogo(true);
            await api.uploadBrandLogo(logoFile, newBrand.id);
          } catch (uploadError: any) {
            console.error("Failed to upload logo:", uploadError);
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
      alert(error.message || "Failed to save brand");
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

  function handleEditProduct(product: any) {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      code: product.code || "",
      description: product.description || "",
      photo_url: product.photo_url || "",
    });
    setShowProductForm(true);
  }

  function handleNewProduct() {
    setEditingProduct(null);
    setProductForm({ name: "", code: "", description: "", photo_url: "" });
    setShowProductForm(true);
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }
    try {
      await api.deleteProduct(productId);
      await loadBrandDetails(selectedBrand!.id);
      await loadData();
    } catch (error: any) {
      alert(error.message || "Failed to delete product");
    }
  }

  async function handleProductPhotoUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    productId?: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      if (productId) {
        // Upload photo for existing product
        const result = await api.uploadProductPhoto(file, productId);
        setProductForm({ ...productForm, photo_url: result.url });
        await loadBrandDetails(selectedBrand!.id);
      } else {
        // For new products, we'll upload after creation
        // For now, just show a preview
        const reader = new FileReader();
        reader.onload = (e) => {
          // Store as data URL temporarily, will upload after product creation
          setProductForm({
            ...productForm,
            photo_url: e.target?.result as string,
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (error: any) {
      alert(error.message || "Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      e.target.value = ""; // Reset input
    }
  }

  async function handleSaveProductWithPhoto() {
    if (!selectedBrand) return;

    try {
      let photoUrl = productForm.photo_url;

      // If photo_url is a data URL (preview), we need to upload it after creating the product
      if (photoUrl && photoUrl.startsWith("data:")) {
        // Create product first
        const product = editingProduct
          ? await api.updateProduct(editingProduct.id, {
              name: productForm.name,
              code: productForm.code,
              description: productForm.description,
              photo_url: "",
            })
          : await api.addProduct(selectedBrand.id, {
              name: productForm.name,
              code: productForm.code,
              description: productForm.description,
              photo_url: "",
            });

        // Convert data URL to blob and upload
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const file = new File([blob], "product-photo.jpg", {
          type: "image/jpeg",
        });
        const uploadResult = await api.uploadProductPhoto(file, product.id);
        photoUrl = uploadResult.url;

        // Update product with photo URL
        await api.updateProduct(product.id, {
          ...product,
          photo_url: photoUrl,
        });
      } else {
        // Photo already uploaded or no photo, just save product
        if (editingProduct) {
          await api.updateProduct(editingProduct.id, productForm);
        } else {
          await api.addProduct(selectedBrand.id, productForm);
        }
      }

      setProductForm({ name: "", code: "", description: "", photo_url: "" });
      setEditingProduct(null);
      setShowProductForm(false);
      await loadBrandDetails(selectedBrand.id);
      await loadData();
    } catch (error: any) {
      alert(error.message || "Failed to save product");
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
              Marcas
            </h1>
            <p className="text-sm text-gray-500">Gerenciar marcas e produtos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-2 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-0.5">Total de Marcas</p>
              <p className="text-2xl font-bold text-blue-600">
                {brands.length}
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
              Nova Marca
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
                {editing ? "Edit Brand" : "New Brand"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
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
                        src={
                          formData.logo_url.startsWith("data:") ||
                          formData.logo_url.startsWith("http")
                            ? formData.logo_url
                            : `${API_URL}${formData.logo_url}`
                        }
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
                          Logo será enviado após criar a marca
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Visit Frequency
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.visit_frequency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          visit_frequency: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price per Visit
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.price_per_visit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price_per_visit: e.target.value,
                        })
                      }
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stores
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded p-2">
                    {stores.map((store) => (
                      <label
                        key={store.id}
                        className="flex items-center space-x-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={formData.store_ids.includes(store.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                store_ids: [...formData.store_ids, store.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                store_ids: formData.store_ids.filter(
                                  (id) => id !== store.id,
                                ),
                              });
                            }
                          }}
                        />
                        <span>{store.chain_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {editing && selectedBrand && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">Products</h3>
                      <button
                        type="button"
                        onClick={handleNewProduct}
                        className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        + Add Product
                      </button>
                    </div>
                    <div className="space-y-2 mb-4">
                      {selectedBrand.products?.map((product: any) => (
                        <div
                          key={product.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <div className="flex items-center space-x-3">
                            {product.photo_url && (
                              <img
                                src={
                                  product.photo_url.startsWith("http")
                                    ? product.photo_url
                                    : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${product.photo_url}`
                                }
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            )}
                            <div>
                              <span className="font-medium">
                                {product.name}
                              </span>
                              {product.code && (
                                <span className="text-sm text-gray-500 ml-2">
                                  ({product.code})
                                </span>
                              )}
                              {product.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                      {(!selectedBrand.products ||
                        selectedBrand.products.length === 0) && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No products yet
                        </p>
                      )}
                    </div>
                  </div>
                )}
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

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingProduct ? "Edit Product" : "New Product"}
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveProductWithPhoto();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, name: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.code}
                    onChange={(e) =>
                      setProductForm({ ...productForm, code: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Photo
                  </label>
                  {productForm.photo_url && (
                    <div className="mb-2">
                      <img
                        src={
                          productForm.photo_url.startsWith("http") ||
                          productForm.photo_url.startsWith("data:")
                            ? productForm.photo_url
                            : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${productForm.photo_url}`
                        }
                        alt="Product preview"
                        className="w-32 h-32 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (editingProduct) {
                        handleProductPhotoUpload(e, editingProduct.id);
                      } else {
                        handleProductPhotoUpload(e);
                      }
                    }}
                    disabled={uploadingPhoto}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadingPhoto && (
                    <p className="text-sm text-gray-500 mt-1">Uploading...</p>
                  )}
                </div>
                <div className="flex space-x-2 pt-4">
                  <button
                    type="submit"
                    disabled={uploadingPhoto}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {editingProduct ? "Update Product" : "Add Product"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                      setProductForm({
                        name: "",
                        code: "",
                        description: "",
                        photo_url: "",
                      });
                    }}
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
        {brands.length === 0 ? (
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
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma marca encontrada
              </h3>
              <p className="text-gray-500 text-sm">
                Crie uma nova marca para começar
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
                        className="w-4 h-4 text-indigo-500"
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
                      Nome
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Frequência de Visitas
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
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Preço por Visita
                    </div>
                  </th>
                  <th className="px-6 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {brands.map((brand) => (
                  <tr
                    key={brand.id}
                    className="hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100 hover:shadow-sm cursor-pointer transition-all duration-150 group border-b border-gray-50 hover:border-blue-200"
                  >
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {brand.logo_url ? (
                          <img
                            src={`${API_URL}${brand.logo_url}`}
                            alt={brand.name}
                            className="w-10 h-10 object-contain border border-gray-200 rounded group-hover:border-indigo-300 transition-all"
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
                          className={`w-10 h-10 bg-gray-100 rounded flex items-center justify-center group-hover:bg-indigo-100 transition-all ${brand.logo_url ? "hidden" : ""}`}
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
                              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                            />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-700 group-hover:font-semibold transition-all">
                          {brand.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                        {brand.visit_frequency}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-green-700 group-hover:font-semibold transition-all">
                        R$ {parseFloat(brand.price_per_visit || "0").toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(brand)}
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
