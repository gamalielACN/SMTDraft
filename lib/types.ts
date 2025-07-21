export interface User {
  id: string;
  email: string;
  name: string;
  role: 'project_pic' | 'business_ops' | 'admin';
  department: string;
  title: string;
}

export interface Project {
  id: string;
  clientName: string;
  projectName: string;
  projectCode: string;
  status: 'draft' | 'active' | 'inactive' | 'closed';
  metroCity: string;
  startDate: string;
  endDate: string;
  deliveryLeadEmail: string;
  primaryContactEmail: string;
  secondaryContactEmail: string;
  primaryCPMOEmail?: string;
  secondaryCPMOEmail?: string;
  seatCountPercent: number;
  chargedSeatPercent: number;
  seatRate: number;
  createdBy: string;
  lastModified: string;
  wbsEntries: WBSEntry[];
}

export interface WBSEntry {
  id: string;
  wbsCode: string;
  isDefault: boolean;
  isActive: boolean;
  createdDate: string;
}

export interface Employee {
  id: string;
  eid: string;
  email: string;
  projectName: string;
  projectId: string;
  role: string;
  status: string;
}

export interface Facility {
  id: string;
  name: string;
  metroCity: string;
  buildingName: string;
  buildingFloor: number;
  address: string;
  totalSeats: number;
  availableSeats: number;
}

export interface SeatType {
  id: string;
  name: string;
  costPerMonth: number;
  notes: string;
}

export interface SeatInventory {
  id: string;
  facilityId: string;
  seatCode: string;
  seatTypeId: string;
  status: 'available' | 'allocated' | 'blocked';
  floor: number;
  zone: string;
  notes?: string;
}

export interface SeatRequest {
  id: string;
  projectId: string;
  requestorId: string;
  startDate: string;
  endDate: string;
  headcount: number;
  seatCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  projectComments?: string;
  busOpsComments?: string;
  employeeIds: string[];
  seatIds: string[];
  employeeEmails?: string[]; // Add this for consistency
  createdDate: string;
  lastModified: string;
}

export interface SeatAssignment {
  id: string;
  seatId: string;
  facilityId: string;
  employeeId: string; // Now represents project-seat identifier instead of actual employee
  projectId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Invoice {
  id: string;
  projectId: string;
  billingPeriod: string;
  startDate: string;
  endDate: string;
  totalCost: number;
  status: 'pending_approval' | 'pending_revision' | 'approved';
  seatRate: number;
  chargedSeatPercent: number;
  projectComments?: string;
  busOpsComments?: string;
  adjustedAmount?: number;
  generatedDate: string;
  confirmedBy?: string;
  confirmedDate?: string;
  transactions: InvoiceTransaction[];
  payments: InvoicePayment[];
}

export interface InvoiceTransaction {
  id: string;
  startDate: string;
  endDate: string;
  headcount: number;
  chargedSeat: number;
  workingDays: number;
  value: number;
}

export interface InvoicePayment {
  id: string;
  wbsCode: string;
  amount: number;
}

export interface Ticket {
  id: string;
  type: 'project_setup' | 'seat_allocation' | 'seat_modification' | 'project_reactivation' | 'seat_cancellation';
  projectId?: string;
  createdBy: string;
  currentStatus: 'pending' | 'approved' | 'rejected' | 'cancelled';
  assignedTo?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdDate: string;
  lastModified: string;
  comments: TicketComment[];
  relatedSeatRequestId?: string;
  formData: any;
  busOpsComments?: string;
}

export interface TicketComment {
  id: string;
  userId: string;
  message: string;
  createdDate: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isActive: boolean;
}

export interface DashboardStats {
  pendingTickets: number;
  pendingSeatRequests: number;
  projectsEndingSoon: number;
  invoicesPendingConfirmation: number;
  totalProjects: number;
  totalSeats: number;
  totalEmployees: number;
  citySummary: CitySummary[];
}

export interface CitySummary {
  city: string;
  projects: number;
  seats: number;
  employees: number;
}