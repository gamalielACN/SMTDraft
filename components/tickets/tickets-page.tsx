'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Ticket as TicketIcon, Download, Plus, AlertCircle, Filter, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { API_BASE_URL, apiClient, type ApiError } from '@/lib/api';
import type { Ticket, Project } from '@/lib/types';

interface TicketsPageProps {
  userRole: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Mock users data for name mapping
const users = [
  { id: '1', name: 'John Doe', email: 'john.doe@accenture.com' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@accenture.com' },
  { id: '3', name: 'Admin User', email: 'admin@accenture.com' }
];

export function TicketsPage({ userRole }: TicketsPageProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchData = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);
      if (createdByFilter && createdByFilter !== 'all') params.append('createdBy', createdByFilter);
      
      const [ticketsResponse, projectsData] = await Promise.all([
        fetch(`${API_BASE_URL || 'http://localhost:3001/api'}/tickets?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        apiClient.getProjects()
      ]);
      
      if (!ticketsResponse.ok) {
        throw new Error('Failed to fetch tickets');
      }
      
      const ticketsData = await ticketsResponse.json();
      setTickets(ticketsData.data);
      setPagination(ticketsData.pagination);
      // Handle both paginated and direct array responses
      const projects = projectsData.data || projectsData;
      setProjects(Array.isArray(projects) ? projects : []);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter, dateFromFilter, dateToFilter, createdByFilter, pagination.limit]);

  useEffect(() => {
    fetchData(1);
  }, [searchTerm, statusFilter, typeFilter, dateFromFilter, dateToFilter, createdByFilter]);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : `User ${userId}`;
  };

  const getProject = (projectId?: string) => {
    if (!projectId) return null;
    return projects.find(p => p.id === projectId);
  };

  const getTicketData = (ticket: Ticket) => {
    const project = getProject(ticket.projectId);
    
    return {
      companyName: ticket.type === 'project_setup' ? '-' : (project?.clientName || '-'),
      projectName: ticket.type === 'project_setup' ? '-' : (project?.projectName || '-'),
      metroCity: ticket.type === 'project_setup' 
        ? ticket.formData?.metroCity || '-'
        : (project?.metroCity || '-'),
      startDate: ticket.type === 'project_setup'
        ? ticket.formData?.startDate
        : ticket.formData?.startDate,
      endDate: ticket.type === 'project_setup'
        ? ticket.formData?.endDate
        : ticket.formData?.endDate,
      headcount: ticket.formData?.headcount || '-'
    };
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project_setup': return 'bg-blue-100 text-blue-800';
      case 'seat_allocation': return 'bg-green-100 text-green-800';
      case 'project_reactivation': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const TableSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-24" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-20" />
            {userRole === 'project_pic' && <Skeleton className="h-9 w-28" />}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <TableSkeleton />
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load tickets</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => fetchData(1)}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {userRole === 'project_pic' && (
            <Button size="sm" onClick={() => router.push('/tickets/new')}>
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="project_setup">Project Setup</SelectItem>
                <SelectItem value="seat_allocation">Seat Allocation</SelectItem>
                <SelectItem value="project_reactivation">Project Reactivation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              placeholder="From date"
              value={dateFromFilter}
              onChange={(e) => setDateFromFilter(e.target.value)}
              className="w-40"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="date"
              placeholder="To date"
              value={dateToFilter}
              onChange={(e) => setDateToFilter(e.target.value)}
              className="w-40"
            />
          </div>
          
          <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Created by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets Table */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-accenture-500" />
            Tickets ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket Number</TableHead>
                    <TableHead>Ticket Type</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Metro City</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Headcount</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket, index) => {
                    const ticketData = getTicketData(ticket);
                    
                    return (
                      <TableRow 
                        key={`${ticket.id}-${ticket.type}-${index}`} 
                        className="hover:bg-accenture-50/50 cursor-pointer"
                        onClick={() => router.push(`/tickets/${ticket.id}`)}
                      >
                        <TableCell className="font-medium">#{ticket.id}</TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(ticket.type)} variant="outline">
                            {formatType(ticket.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticketData.companyName}</TableCell>
                        <TableCell>{ticketData.projectName}</TableCell>
                        <TableCell>{ticketData.metroCity}</TableCell>
                        <TableCell>{formatDate(ticketData.startDate)}</TableCell>
                        <TableCell>{formatDate(ticketData.endDate)}</TableCell>
                        <TableCell>{ticketData.headcount}</TableCell>
                        <TableCell>{getUserName(ticket.createdBy)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(ticket.currentStatus)}>
                            {ticket.currentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tickets
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrev || isLoading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, pagination.page - 2) + i;
                        return (
                          <Button
                            key={`ticket-page-${pageNum}`}
                            variant={pageNum === pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            disabled={isLoading}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNext || isLoading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <TicketIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter || typeFilter ? 'Try adjusting your search criteria or filters' : 'No tickets have been created yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}