'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileText, Calendar, DollarSign, Download, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import { API_BASE_URL, apiClient, type ApiError } from '@/lib/api';
import type { Invoice, Project } from '@/lib/types';

interface InvoicesPageProps {
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

export function InvoicesPage({ userRole }: InvoicesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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
      if (projectFilter && projectFilter !== 'all') params.append('project', projectFilter);
      
      const [invoicesData, projectsData] = await Promise.all([
        fetch(`${API_BASE_URL || 'http://localhost:3001/api'}/invoices?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        apiClient.getProjects()
      ]);
      
      if (!invoicesData.ok) {
        throw new Error('Failed to fetch invoices');
      }
      
      const invoicesResult = await invoicesData.json();
      setInvoices(invoicesResult.data || invoicesResult);
      setPagination(invoicesResult.pagination || {
        page: 1,
        limit: 20,
        total: (invoicesResult.data || invoicesResult).length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      });
      // Handle both paginated and direct array responses
      const projects = projectsData.data || projectsData;
      setProjects(Array.isArray(projects) ? projects : []);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, projectFilter, pagination.limit]);

  useEffect(() => {
    fetchData(1);
  }, [searchTerm, statusFilter, projectFilter]);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.projectName : 'Unknown Project';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'pending_revision': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const InvoiceCardSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
        <div className="pt-2 border-t">
          <Skeleton className="h-4 w-1/3 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
        
        <Skeleton className="h-10 w-80" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <InvoiceCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load invoices</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => fetchData}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending_approval">Pending Approval</SelectItem>
              <SelectItem value="pending_revision">Pending Revision</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.projectName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Invoice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Invoice {invoice.id}</CardTitle>
                  <p className="text-sm text-muted-foreground">{getProjectName(invoice.projectId)}</p>
                </div>
                <Badge className={getStatusColor(invoice.status)}>
                  {invoice.status.replace('_', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{invoice.billingPeriod}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(invoice.totalCost)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Generated: {formatDate(invoice.generatedDate)}</span>
              </div>
              
              {invoice.confirmedDate && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>Confirmed: {formatDate(invoice.confirmedDate)}</span>
                </div>
              )}
              
              <div className="pt-2 border-t">
                <div className="text-sm font-medium mb-2">Details</div>
                <div className="text-sm text-muted-foreground">
                  Rate: {formatCurrency(invoice.seatRate)}/month
                </div>
                <div className="text-sm text-muted-foreground">
                  Charged: {invoice.chargedSeatPercent}%
                </div>
              </div>
              
              {invoice.status === 'pending_approval' && userRole === 'project_pic' && (
                <div className="pt-2">
                  <Button size="sm" className="w-full">
                    Review & Confirm
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {invoices.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || projectFilter !== 'all' 
              ? 'Try adjusting your search criteria or filters' 
              : 'No invoices have been generated yet'}
          </p>
        </div>
      )}
    </div>
  );
}