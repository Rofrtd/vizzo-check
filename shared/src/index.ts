// User types
export type UserRole = 'system_admin' | 'agency' | 'promoter';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  agency_id: string | null;
  created_at: string;
}

// Agency types
export interface Agency {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Promoter types
export interface Promoter {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  city: string;
  visit_frequency_per_brand: Record<string, number>;
  availability_days: number[];
  payment_per_visit: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Brand types
export interface Brand {
  id: string;
  agency_id: string;
  name: string;
  visit_frequency: number;
  price_per_visit: number;
  created_at: string;
  updated_at: string;
}

export interface BrandContact {
  id: string;
  brand_id: string;
  name: string;
  phone: string;
  role: string;
}

export interface Product {
  id: string;
  brand_id: string;
  name: string;
  code: string;
  description: string;
  photo_url: string;
  created_at: string;
}

// Store types
export type StoreType = 'retail' | 'wholesale';

export interface Store {
  id: string;
  agency_id: string;
  chain_name: string;
  type: StoreType;
  address: string;
  gps_latitude: number;
  gps_longitude: number;
  radius_meters: number;
  shelf_layout_pdf_url: string | null;
  product_category: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreContact {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  role: string;
}

// Visit types
export type VisitStatus = 'completed' | 'edited';

export interface Visit {
  id: string;
  promoter_id: string;
  store_id: string;
  brand_id: string;
  gps_latitude: number;
  gps_longitude: number;
  timestamp: string;
  status: VisitStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitProduct {
  id: string;
  visit_id: string;
  product_id: string;
  quantity: number;
  photo_before_url: string;
  photo_after_url: string;
  created_at: string;
}

export interface VisitWithDetails extends Visit {
  promoter: Promoter;
  store: Store;
  brand: Brand;
  products: (VisitProduct & { product: Product })[];
}

// API Request/Response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  agency_name: string;
  admin_name: string;
}

export interface CreateVisitRequest {
  store_id: string;
  brand_id: string;
  gps_latitude: number;
  gps_longitude: number;
  products: {
    product_id: string;
    quantity: number;
    photo_before: string; // base64 or file URL
    photo_after: string; // base64 or file URL
    notes?: string; // Notes per product
  }[];
}

export interface FinancialReportQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: 'brand' | 'store' | 'city';
}

export interface FinancialReport {
  total_visits: number;
  total_promoter_payments: number;
  total_brand_charges: number;
  gross_margin: number;
  grouped_data?: Array<{
    group_key: string;
    visits: number;
    promoter_payments: number;
    brand_charges: number;
    gross_margin: number;
  }>;
}

// Filter types
export interface VisitFilters {
  startDate?: string;
  endDate?: string;
  promoter_id?: string;
  store_id?: string;
  brand_id?: string;
  status?: VisitStatus;
}
