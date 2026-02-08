
export interface Stop {
  id: string;
  address: string;
  customerName?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'skipped';
  lat?: number;
  lng?: number;
  order: number;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone?: string;
}

export type ViewType = 'dashboard' | 'route' | 'addressbook' | 'import';
