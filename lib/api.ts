import { toast } from 'sonner';
import { apiCache } from './api-cache';

// export const API_BASE_URL = 'http://localhost:3001/api';
export const API_BASE_URL = 'https://smtdraft.onrender.com/api';

interface ApiError {
  message: string;
  status: number;
  type: 'network' | 'auth' | 'validation' | 'server' | 'unknown';
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private handleError(error: any, endpoint: string): never {
    let apiError: ApiError;

    if (!navigator.onLine) {
      apiError = {
        message: 'No internet connection. Please check your network.',
        status: 0,
        type: 'network'
      };
    } else if (error.name === 'TypeError' || error.message.includes('fetch')) {
      apiError = {
        message: 'Unable to connect to server. Please try again later.',
        status: 0,
        type: 'network'
      };
    } else if (error.status === 401) {
      apiError = {
        message: 'Your session has expired. Please log in again.',
        status: 401,
        type: 'auth'
      };
      // Clear token on auth error
      this.clearToken();
      localStorage.removeItem('auth_token');
    } else if (error.status === 403) {
      apiError = {
        message: 'You do not have permission to perform this action.',
        status: 403,
        type: 'auth'
      };
    } else if (error.status === 400) {
      apiError = {
        message: error.message || 'Invalid request. Please check your input.',
        status: 400,
        type: 'validation'
      };
    } else if (error.status >= 500) {
      apiError = {
        message: 'Server error. Please try again later.',
        status: error.status,
        type: 'server'
      };
    } else {
      apiError = {
        message: error.message || 'An unexpected error occurred.',
        status: error.status || 0,
        type: 'unknown'
      };
    }

    // Show toast notification for errors
    toast.error(apiError.message);
    
    console.error(`API Error [${endpoint}]:`, apiError);
    throw apiError;
  }

  private async request(endpoint: string, options: RequestInit = {}, useCache: boolean = true) {
    const url = `${API_BASE_URL}${endpoint}`;
    const cacheKey = `${endpoint}_${JSON.stringify(options)}`;
    
    // Check cache for GET requests
    if (useCache && (!options.method || options.method === 'GET')) {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      const data = await response.json();
      
      // Cache successful GET responses
      if (useCache && (!options.method || options.method === 'GET')) {
        apiCache.set(cacheKey, data);
      }
      
      return data;
    } catch (error) {
      this.handleError(error, endpoint);
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }, false); // Don't cache login requests
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async logout() {
    const result = await this.request('/auth/logout', { method: 'POST' }, false);
    // Clear cache on logout
    apiCache.clear();
    return result;
  }

  // Dashboard endpoints
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  // Project endpoints
  async getProjects() {
    return this.request('/projects');
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  async createProject(projectData: any) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    }, false);
  }

  async updateProject(id: string, projectData: any) {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    }, false);
  }

  // Employee endpoints
  async getEmployees() {
    return this.request('/employees');
  }

  async getEmployee(id: string) {
    return this.request(`/employees/${id}`);
  }

  async getProjectEmployees(projectId: string) {
    return this.request(`/employees/project/${projectId}`);
  }
  // Seat endpoints
  async getSeats() {
    return this.request('/seats');
  }

  async getSeatAssignments() {
    return this.request('/seats/assignments');
  }

  async getSeatRequests() {
    return this.request('/seats/requests');
  }

  async createSeatRequest(requestData: any) {
    return this.request('/seats/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }, false);
  }

  // Invoice endpoints
  async getInvoices() {
    return this.request('/invoices');
  }

  async updateInvoice(id: string, invoiceData: any) {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoiceData),
    }, false);
  }

  async generateInvoice(invoiceData: any) {
    return this.request('/invoices/generate', {
      method: 'POST',
      body: JSON.stringify(invoiceData),
    }, false);
  }

  // Ticket endpoints
  async getTickets() {
    return this.request('/tickets');
  }

  async getTicket(id: string) {
    return this.request(`/tickets/${id}`);
  }

  async createTicket(ticketData: any) {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    }, false);
  }

  async updateTicket(id: string, ticketData: any) {
    return this.request(`/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(ticketData),
    }, false);
  }

  // Master data endpoints
  async getFacilities() {
    return this.request('/master-data/facilities');
  }

  async getHolidays() {
    return this.request('/master-data/holidays');
  }

  async getSeatTypes() {
    return this.request('/master-data/seat-types');
  }

  async createFacility(facilityData: any) {
    return this.request('/master-data/facilities', {
      method: 'POST',
      body: JSON.stringify(facilityData),
    }, false);
  }

  async createHoliday(holidayData: any) {
    return this.request('/master-data/holidays', {
      method: 'POST',
      body: JSON.stringify(holidayData),
    }, false);
  }
}

export const apiClient = new ApiClient();
export type { ApiError };