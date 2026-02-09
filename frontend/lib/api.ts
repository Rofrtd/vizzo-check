const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || this.token;
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: {
    email: string;
    password: string;
    agency_name: string;
    admin_name: string;
  }) {
    return this.request<{ token: string; user: any }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<{ user: any }>("/api/auth/me");
  }

  // Agencies (system_admin only)
  async listAgencies() {
    return this.request("/api/agencies");
  }

  async getAgency(id: string) {
    return this.request(`/api/agencies/${id}`);
  }

  // Promoters
  async listPromoters(agencyId?: string | null) {
    const q = agencyId ? `?agency_id=${encodeURIComponent(agencyId)}` : "";
    return this.request(`/api/promoters${q}`);
  }

  async createPromoter(data: any) {
    return this.request("/api/promoters", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getPromoter(id: string) {
    return this.request(`/api/promoters/${id}`);
  }

  async updatePromoter(id: string, data: any) {
    return this.request(`/api/promoters/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async togglePromoterActive(id: string) {
    return this.request(`/api/promoters/${id}/active`, {
      method: "PATCH",
    });
  }

  // Brands
  async listBrands(agencyId?: string | null) {
    const q = agencyId ? `?agency_id=${encodeURIComponent(agencyId)}` : "";
    return this.request(`/api/brands${q}`);
  }

  async createBrand(data: any) {
    return this.request("/api/brands", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getBrand(id: string) {
    return this.request(`/api/brands/${id}`);
  }

  async updateBrand(id: string, data: any) {
    return this.request(`/api/brands/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async addProduct(brandId: string, data: any) {
    return this.request(`/api/brands/${brandId}/products`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProduct(productId: string, data: any) {
    return this.request(`/api/brands/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId: string) {
    return this.request(`/api/brands/products/${productId}`, {
      method: "DELETE",
    });
  }

  // Stores
  async listStores(agencyId?: string | null) {
    const q = agencyId ? `?agency_id=${encodeURIComponent(agencyId)}` : "";
    return this.request(`/api/stores${q}`);
  }

  async getAuthorizedStores() {
    return this.request("/api/stores/authorized");
  }

  async getAuthorizedBrandsForStore(storeId: string) {
    return this.request(`/api/brands/authorized/${storeId}`);
  }

  async createStore(data: any) {
    return this.request("/api/stores", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getStore(id: string) {
    return this.request(`/api/stores/${id}`);
  }

  async updateStore(id: string, data: any) {
    return this.request(`/api/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Visits
  async listVisits(filters?: { agency_id?: string; startDate?: string; endDate?: string; promoter_id?: string; store_id?: string; brand_id?: string; status?: string }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value != null && value !== "") {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    return this.request(`/api/visits${queryString ? `?${queryString}` : ""}`);
  }

  async getMyVisits() {
    return this.request("/api/visits/my-visits");
  }

  async getMyEarnings() {
    return this.request("/api/promoters/earnings/my");
  }

  async createVisit(data: any) {
    return this.request("/api/visits", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getVisit(id: string) {
    return this.request(`/api/visits/${id}`);
  }

  async updateVisit(id: string, data: any) {
    return this.request(`/api/visits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async updateVisitProductPhotos(
    visitId: string,
    productId: string,
    photoBeforeUrl: string,
    photoAfterUrl: string,
    notes?: string | null,
  ) {
    return this.request(`/api/visits/${visitId}/products/${productId}/photos`, {
      method: "PUT",
      body: JSON.stringify({
        photo_before_url: photoBeforeUrl,
        photo_after_url: photoAfterUrl,
        notes: notes || null,
      }),
    });
  }

  // Reports (pass agency_id in query for system_admin)
  async getFinancialReport(query?: Record<string, string>) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/reports/financial${params ? `?${params}` : ""}`);
  }

  async exportFinancialReport(format: "csv" | "pdf", query?: Record<string, string>) {
    const params = new URLSearchParams({ ...query, format }).toString();
    const token = this.getToken();
    const response = await fetch(
      `${API_URL}/api/reports/financial/export?${params}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Export failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report.${format}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async getPromoterReport(query?: Record<string, string>) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/reports/promoters${params ? `?${params}` : ""}`);
  }

  async getBrandReport(query?: Record<string, string>) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/reports/brands${params ? `?${params}` : ""}`);
  }

  async getStoreReport(query?: Record<string, string>) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/reports/stores${params ? `?${params}` : ""}`);
  }

  async getToBePaidReport(query?: Record<string, string>) {
    const params = new URLSearchParams(query).toString();
    return this.request(`/api/reports/to-be-paid${params ? `?${params}` : ""}`);
  }

  async getToBeReceivedReport(query?: Record<string, string>) {
    const params = new URLSearchParams(query).toString();
    return this.request(
      `/api/reports/to-be-received${params ? `?${params}` : ""}`,
    );
  }

  async getPlannedVisits(params?: { startDate?: string; endDate?: string; agency_id?: string }) {
    const search = new URLSearchParams();
    if (params?.startDate) search.append("startDate", params.startDate);
    if (params?.endDate) search.append("endDate", params.endDate);
    if (params?.agency_id) search.append("agency_id", params.agency_id);
    const queryString = search.toString();
    return this.request(`/api/reports/planned-visits${queryString ? `?${queryString}` : ""}`);
  }

  async getBrandsWithoutAllocations(agencyId?: string | null) {
    const q = agencyId ? `?agency_id=${encodeURIComponent(agencyId)}` : "";
    return this.request(`/api/reports/brands-without-allocations${q}`);
  }

  // Upload
  async uploadPhoto(
    file: File,
    visitId: string,
    productId: string,
    type: "before" | "after",
  ) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("visit_id", visitId);
    formData.append("product_id", productId);
    formData.append("type", type);

    const response = await fetch(`${API_URL}/api/upload/photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  }

  async uploadProductPhoto(file: File, productId: string) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("product_id", productId);

    const response = await fetch(`${API_URL}/api/upload/product-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  }

  async uploadBrandLogo(file: File, brandId: string) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("logo", file);
    formData.append("brand_id", brandId);

    const response = await fetch(`${API_URL}/api/upload/brand-logo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  }

  async uploadStoreLogo(file: File, storeId: string) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("logo", file);
    formData.append("store_id", storeId);

    const response = await fetch(`${API_URL}/api/upload/store-logo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  }

  async uploadPromoterPhoto(file: File, promoterId: string) {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("photo", file);
    formData.append("promoter_id", promoterId);

    const response = await fetch(`${API_URL}/api/upload/promoter-photo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }

    return response.json();
  }

  // Allocation methods (pass agency_id for system_admin)
  async getAllocations(filters?: { promoter_id?: string; brand_id?: string; store_id?: string; agency_id?: string }) {
    const queryParams = new URLSearchParams();
    if (filters?.promoter_id) queryParams.append("promoter_id", filters.promoter_id);
    if (filters?.brand_id) queryParams.append("brand_id", filters.brand_id);
    if (filters?.store_id) queryParams.append("store_id", filters.store_id);
    if (filters?.agency_id) queryParams.append("agency_id", filters.agency_id);
    const query = queryParams.toString();
    return this.request(`/api/allocations${query ? `?${query}` : ""}`);
  }

  async getAllocation(id: string) {
    return this.request(`/api/allocations/${id}`);
  }

  async createAllocation(data: {
    promoter_id: string;
    brand_id: string;
    store_id: string;
    days_of_week: number[];
    frequency_per_week: number;
    active?: boolean;
    agency_id?: string;
  }) {
    return this.request("/api/allocations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateAllocation(id: string, data: {
    days_of_week?: number[];
    frequency_per_week?: number;
    active?: boolean;
  }) {
    return this.request(`/api/allocations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteAllocation(id: string) {
    return this.request(`/api/allocations/${id}`, {
      method: "DELETE",
    });
  }

  async getAllocationSuggestions(promoterId: string, brandId: string, storeId: string, frequencyPerWeek: number = 1) {
    return this.request(`/api/allocations/suggestions/${promoterId}/${brandId}/${storeId}?frequency=${frequencyPerWeek}`);
  }
}

export const api = new ApiClient();
