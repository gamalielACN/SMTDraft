'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Building, Calendar, Users, MapPin, Mail, DollarSign, FileText, Wheat as Seat, AlertCircle, CheckCircle, Clock, User, Edit, Save, X, Plus, Trash2 } from 'lucide-react';
import { apiClient, type ApiError } from '@/lib/api';
import type { Project, SeatRequest, Invoice } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

interface ProjectEmployee {
  id: string;
  eid: string;
  email: string;
  role: string;
  status: string;
}
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [activeModule, setActiveModule] = useState('projects');
  const [project, setProject] = useState<Project | null>(null);
  const [seatRequests, setSeatRequests] = useState<SeatRequest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<ProjectEmployee[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isEditingWbs, setIsEditingWbs] = useState(false);
  const [editedWbsEntries, setEditedWbsEntries] = useState<any[]>([]);
  const [newWbsCode, setNewWbsCode] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const projectId = params.id as string;

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [projectData, seatRequestsData, invoicesData, employeesData, ticketsData] = await Promise.all([
        apiClient.getProject(projectId),
        apiClient.getSeatRequests(),
        apiClient.getInvoices(),
        apiClient.getTickets(),
        apiClient.getTickets().catch(() => []) // Handle potential error gracefully
      ]);
      
      setProject(projectData);
      // Filter seat requests and invoices for this project
      // Handle both paginated and direct array responses
      const seatRequests = seatRequestsData.data || seatRequestsData;
      const invoices = invoicesData.data || invoicesData;
      const allTickets = ticketsData.data || ticketsData;
      const employeesTickets = employeesData.data || employeesData;
      
      setSeatRequests(Array.isArray(seatRequests) ? seatRequests.filter((sr: SeatRequest) => sr.projectId === projectId) : []);
      setInvoices(Array.isArray(invoices) ? invoices.filter((inv: Invoice) => inv.projectId === projectId) : []);
      
      // Get employees from approved seat allocation tickets for this project
      const projectSeatTickets = Array.isArray(employeesTickets) 
        ? employeesTickets.filter((ticket: any) => 
            ticket.type === 'seat_allocation' && 
            ticket.projectId === projectId && 
            ticket.currentStatus === 'approved'
          )
        : [];
      
      // Get latest ticket for this project (by ticket ID)
      const latestTicket = projectSeatTickets.reduce((latest: any, current: any) => {
        return !latest || parseInt(current.id) > parseInt(latest.id) ? current : latest;
      }, null);
      
      // Extract all employee emails from approved tickets
      const projectEmployees: ProjectEmployee[] = [];
      
      // Only process latest ticket
      if (latestTicket) {
        const ticket = projectSeatTickets?.[0];
        const employeeEmails = ticket?.formData?.employeeEmails || [];
        employeeEmails.forEach((email: string, index: number) => {
          if (email && email.includes('@')) {
            projectEmployees.push({
              id: `${email}_${projectId}_${ticket.id}`,
              eid: email.split('@')[0],
              email: email,
              role: 'Team Member', // Default role for team members
              status: 'Active'
            });
          }
        });
      }

      setEmployees(projectEmployees);
      setTickets(Array.isArray(allTickets) ? allTickets : []);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWbs = () => {
    setEditedWbsEntries([...project!.wbsEntries]);
    setIsEditingWbs(true);
  };

  const handleCancelWbsEdit = () => {
    setIsEditingWbs(false);
    setEditedWbsEntries([]);
    setNewWbsCode('');
  };

  const handleSaveWbs = async () => {
    if (!project) return;
    
    try {
      setIsUpdating(true);
      
      // Validate at least one WBS entry
      if (editedWbsEntries.length === 0) {
        toast.error('At least one WBS entry is required');
        return;
      }
      
      // Validate at least one default
      const hasDefault = editedWbsEntries.some(entry => entry.isDefault);
      if (!hasDefault) {
        toast.error('At least one WBS entry must be set as default');
        return;
      }
      
      // Validate only one default
      const defaultCount = editedWbsEntries.filter(entry => entry.isDefault).length;
      if (defaultCount > 1) {
        toast.error('Only one WBS entry can be set as default');
        return;
      }
      
      // Validate default is active
      const defaultWbs = editedWbsEntries.find(entry => entry.isDefault);
      if (defaultWbs && !defaultWbs.isActive) {
        toast.error('Default WBS entry must be active');
        return;
      }
      
      // Validate all WBS codes are filled
      const emptyWbs = editedWbsEntries.filter(entry => !entry.wbsCode.trim());
      if (emptyWbs.length > 0) {
        toast.error('All WBS codes must be filled');
        return;
      }
      
      // Check for duplicates
      const wbsCodes = editedWbsEntries.map(entry => entry.wbsCode.trim().toLowerCase());
      const duplicates = wbsCodes.filter((code, index) => wbsCodes.indexOf(code) !== index);
      if (duplicates.length > 0) {
        toast.error('Duplicate WBS codes are not allowed');
        return;
      }
      
      const updatedProject = await apiClient.updateProject(project.id, {
        wbsEntries: editedWbsEntries
      });
      
      setProject(updatedProject);
      setIsEditingWbs(false);
      setEditedWbsEntries([]);
      setNewWbsCode('');
      toast.success('WBS entries updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update WBS entries');
    } finally {
      setIsUpdating(false);
    }
  };

  const addWbsEntry = () => {
    if (!newWbsCode.trim()) return;
    
    // Check for duplicates
    const isDuplicate = editedWbsEntries.some(entry => 
      entry.wbsCode.toLowerCase() === newWbsCode.trim().toLowerCase()
    );
    
    if (isDuplicate) {
      toast.error('WBS code already exists');
      return;
    }
    
    const newEntry = {
      id: Date.now().toString(),
      wbsCode: newWbsCode.trim(),
      isActive: true,
      isDefault: editedWbsEntries.length === 0, // First entry is default
      createdDate: new Date().toISOString()
    };
    
    setEditedWbsEntries(prev => [...prev, newEntry]);
    setNewWbsCode('');
  };

  const removeWbsEntry = (index: number) => {
    if (editedWbsEntries.length <= 1) {
      toast.error('At least one WBS entry is required');
      return;
    }
    
    const entryToRemove = editedWbsEntries[index];
    const updatedEntries = editedWbsEntries.filter((_, i) => i !== index);
    
    // If removing default entry, make first remaining entry default
    if (entryToRemove.isDefault && updatedEntries.length > 0) {
      updatedEntries[0].isDefault = true;
      updatedEntries[0].isActive = true;
    }
    
    setEditedWbsEntries(updatedEntries);
  };

  const updateWbsEntry = (index: number, field: string, value: any) => {
    setEditedWbsEntries(prev => prev.map((entry, i) => {
      if (i === index) {
        const updated = { ...entry, [field]: value };
        
        // If setting as default, unset others and make it active
        if (field === 'isDefault' && value === true) {
          updated.isActive = true;
          return updated;
        }
        
        // If unsetting active and it's default, prevent it
        if (field === 'isActive' && value === false && entry.isDefault) {
          toast.error('Default WBS entry cannot be deactivated');
          return entry;
        }
        
        return updated;
      } else if (field === 'isDefault' && value === true) {
        // Unset default for other entries
        return { ...entry, isDefault: false };
      }
      return entry;
    }));
  };

  const updateWbsCode = (index: number, newCode: string) => {
    // Check for duplicates (excluding current entry)
    const isDuplicate = editedWbsEntries.some((entry, i) => 
      i !== index && entry.wbsCode.toLowerCase() === newCode.toLowerCase()
    );
    
    if (isDuplicate && newCode.trim()) {
      toast.error('WBS code already exists');
      return;
    }
    
    updateWbsEntry(index, 'wbsCode', newCode);
  };

  // Check if user can edit WBS (project PIC with access to this project)
  const canEditWbs = user?.role === 'project_pic' && project && (
    project.deliveryLeadEmail === user.email ||
    project.primaryContactEmail === user.email ||
    project.secondaryContactEmail === user.email ||
    project.primaryCPMOEmail === user.email ||
    project.secondaryCPMOEmail === user.email
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'closed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeatRequestStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800';
      case 'pending_revision': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'delivery lead': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'primary contact': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'secondary contact': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'primary cpmo': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'secondary cpmo': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'team member': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEmployeeStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const ProjectDetailSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isLoading) {
    return (
      <AppLayout 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      >
        <ProjectDetailSkeleton />
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Project Details</h1>
          </div>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load project</h3>
            <p className="text-muted-foreground mb-4">{error?.message || 'Project not found'}</p>
            <Button onClick={fetchProjectData}>Try Again</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      activeModule={activeModule}
      onModuleChange={setActiveModule}
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/projects')}
            className="hover:bg-accenture-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">{project.projectName}</h1>
            <p className="text-muted-foreground">{project.clientName}</p>
          </div>
          <Badge className={getStatusColor(project.status)}>
            {project.status}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="data-[state=active]:bg-accenture-500 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="seats" className="data-[state=active]:bg-accenture-500 data-[state=active]:text-white">
              Seat Requests
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-accenture-500 data-[state=active]:text-white">
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Project Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Basic Information */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-accenture-500" />
                    Project Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Project Code</span>
                    <span className="text-sm text-muted-foreground">{project.projectCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Metro City</span>
                    <span className="text-sm text-muted-foreground">{project.metroCity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge className={getStatusColor(project.status)} variant="outline">
                      {project.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Created By</span>
                    <span className="text-sm text-muted-foreground">User {project.createdBy}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-accenture-500" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Start Date</span>
                    <span className="text-sm text-muted-foreground">{formatDate(project.startDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">End Date</span>
                    <span className="text-sm text-muted-foreground">{formatDate(project.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Duration</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Last Modified</span>
                    <span className="text-sm text-muted-foreground">{formatDate(project.lastModified)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accenture-500" />
                    Financial Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Seat Rate</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(project.seatRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Seat Count %</span>
                    <span className="text-sm text-muted-foreground">{project.seatCountPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Charged Seat %</span>
                    <span className="text-sm text-muted-foreground">{project.chargedSeatPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">WBS Entries</span>
                    <span className="text-sm text-muted-foreground">{project.wbsEntries.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Project Contacts */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-accenture-500" />
                    Project Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-accenture-500" />
                        <span className="text-sm font-medium">Delivery Lead</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{project.deliveryLeadEmail}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-accenture-500" />
                        <span className="text-sm font-medium">Primary Contact</span>
                      </div>
                      <p className="text-sm text-muted-foreground pl-6">{project.primaryContactEmail}</p>
                    </div>
                    
                    {project.secondaryContactEmail && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-accenture-500" />
                          <span className="text-sm font-medium">Secondary Contact</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{project.secondaryContactEmail}</p>
                      </div>
                    )}
                    
                    {project.primaryCPMOEmail && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-accenture-500" />
                          <span className="text-sm font-medium">Primary CPMO</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{project.primaryCPMOEmail}</p>
                      </div>
                    )}
                    
                    {project.secondaryCPMOEmail && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4 text-accenture-500" />
                          <span className="text-sm font-medium">Secondary CPMO</span>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">{project.secondaryCPMOEmail}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Project Team */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-accenture-500" />
                    Project Team ({employees.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employees.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto border rounded-lg">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((employee, index) => (
                            <TableRow key={`${employee.id}-${employee.email}-${index}`} className="hover:bg-accenture-50/50">
                              <TableCell className="font-medium text-sm">{employee.email}</TableCell>
                              <TableCell>
                                {/* <Badge className={getRoleColor(employee.role)} variant="outline" size="sm"> */}
                                <Badge className={getRoleColor(employee.role)} variant="outline">
                                  {employee.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {/* <Badge className={getEmployeeStatusColor(employee.status)} variant="outline" size="sm"> */}
                                <Badge className={getEmployeeStatusColor(employee.status)} variant="outline">
                                  {employee.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No team members assigned</p>
                      <p className="text-xs text-muted-foreground mt-1">Team members will appear after seat allocation approval</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* WBS Entries */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accenture-500" />
                  WBS Entries
                  </div>
                  {canEditWbs && !isEditingWbs && (
                    <Button variant="outline" size="sm" onClick={handleEditWbs}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit WBS
                    </Button>
                  )}
                  {isEditingWbs && (
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCancelWbsEdit}
                        disabled={isUpdating}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={handleSaveWbs}
                        disabled={isUpdating}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {isUpdating ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isEditingWbs ? (
                  <div className="space-y-3">
                    {project.wbsEntries.map((wbs, index) => (
                      <div key={`${wbs.id}-${wbs.wbsCode}-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accenture-50/50 transition-colors">
                        <div>
                          <div className="font-medium">{wbs.wbsCode}</div>
                          <div className="text-sm text-muted-foreground">
                            Created: {formatDate(wbs.createdDate)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {wbs.isDefault && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                          <Badge variant={wbs.isActive ? "default" : "secondary"} className="text-xs">
                            {wbs.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>WBS Code</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead>Default</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editedWbsEntries.map((entry, index) => (
                          <TableRow key={`${entry.wbsCode}-${entry.id}-${index}`}>
                            <TableCell>
                              <Input
                                value={entry.wbsCode}
                                onChange={(e) => updateWbsCode(index, e.target.value)}
                                placeholder="Enter WBS code"
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={entry.isActive}
                                onCheckedChange={(checked) => updateWbsEntry(index, 'isActive', checked)}
                                disabled={entry.isDefault}
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={entry.isDefault}
                                onCheckedChange={(checked) => updateWbsEntry(index, 'isDefault', checked)}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeWbsEntry(index)}
                                disabled={editedWbsEntries.length <= 1}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    <div className="flex items-center space-x-2">
                      <Input
                        value={newWbsCode}
                        onChange={(e) => setNewWbsCode(e.target.value)}
                        placeholder="Enter new WBS code"
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && addWbsEntry()}
                      />
                      <Button onClick={addWbsEntry} disabled={!newWbsCode.trim()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add WBS
                      </Button>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <p>• At least one WBS entry is required</p>
                      <p>• Default WBS entries cannot be deactivated</p>
                      <p>• Only one WBS can be default at a time</p>
                      <p>• Cannot remove WBS entries used in invoices</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seats" className="space-y-6">
            {/* Get all seat allocation tickets for this project */}
            {(() => {
              // This would normally come from an API call to get tickets filtered by project
              // For now, we'll filter the existing tickets data
              const projectSeatTickets = tickets.filter(ticket => 
                ticket.type === 'seat_allocation' && ticket.projectId === projectId
              );
              
              return (
                <Card className="card-hover">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Seat className="h-5 w-5 text-accenture-500" />
                      Seat Request Tickets ({projectSeatTickets.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {projectSeatTickets.length > 0 ? (
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
                          {projectSeatTickets.map((ticket) => {
                            const getUserName = (userId: string) => {
                              const users = [
                                { id: '1', name: 'John Doe' },
                                { id: '2', name: 'Jane Smith' },
                                { id: '3', name: 'Admin User' }
                              ];
                              const user = users.find(u => u.id === userId);
                              return user ? user.name : `User ${userId}`;
                            };
                            
                            const getTypeColor = (type: string) => {
                              switch (type) {
                                case 'seat_allocation': return 'bg-green-100 text-green-800';
                                default: return 'bg-gray-100 text-gray-800';
                              }
                            };
                            
                            const getStatusColor = (status: string) => {
                              switch (status) {
                                case 'approved': return 'bg-green-100 text-green-800';
                                case 'pending': return 'bg-yellow-100 text-yellow-800';
                                case 'rejected': return 'bg-red-100 text-red-800';
                                default: return 'bg-gray-100 text-gray-800';
                              }
                            };
                            
                            const formatType = (type: string) => {
                              return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                            };
                            
                            return (
                              <TableRow 
                                key={ticket.id} 
                                className="hover:bg-accenture-50/50 cursor-pointer"
                                onClick={() => router.push(`/tickets/${ticket.id}`)}
                              >
                                <TableCell className="font-medium">#{ticket.id}</TableCell>
                                <TableCell>
                                  <Badge className={getTypeColor(ticket.type)} variant="outline">
                                    {formatType(ticket.type)}
                                  </Badge>
                                </TableCell>
                                <TableCell>{project.clientName}</TableCell>
                                <TableCell>{project.projectName}</TableCell>
                                <TableCell>{project.metroCity}</TableCell>
                                <TableCell>
                                  {ticket.formData?.startDate ? formatDate(ticket.formData.startDate) : '-'}
                                </TableCell>
                                <TableCell>
                                  {ticket.formData?.endDate ? formatDate(ticket.formData.endDate) : '-'}
                                </TableCell>
                                <TableCell>{ticket.formData?.headcount || '-'}</TableCell>
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
                    ) : (
                      <div className="text-center py-8">
                        <Seat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No seat request tickets</h3>
                        <p className="text-muted-foreground">No seat allocation tickets have been created for this project yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          <TabsContent value="invoices" className="space-y-6">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accenture-500" />
                  Invoices ({invoices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice, index) => (
                      <div key={`${invoice.id}-${index}-${invoice.status}`} className="border rounded-lg p-4 hover:bg-accenture-50/50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-medium">Invoice #{invoice.id}</div>
                            <div className="text-sm text-muted-foreground">
                              {invoice.billingPeriod} • Generated: {formatDate(invoice.generatedDate)}
                            </div>
                          </div>
                          <Badge className={getInvoiceStatusColor(invoice.status)}>
                            {invoice.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <span className="font-medium">Total Cost:</span>
                            <div className="text-muted-foreground">{formatCurrency(invoice.totalCost)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Seat Rate:</span>
                            <div className="text-muted-foreground">{formatCurrency(invoice.seatRate)}</div>
                          </div>
                          <div>
                            <span className="font-medium">Charged %:</span>
                            <div className="text-muted-foreground">{invoice.chargedSeatPercent}%</div>
                          </div>
                          <div>
                            <span className="font-medium">Period:</span>
                            <div className="text-muted-foreground">{formatDate(invoice.startDate)} - {formatDate(invoice.endDate)}</div>
                          </div>
                        </div>
                        
                        {invoice.confirmedDate && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Confirmed on {formatDate(invoice.confirmedDate)}</span>
                          </div>
                        )}
                        
                        {invoice.adjustedAmount && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Adjusted Amount:</span>
                            <span className="text-muted-foreground ml-2">{formatCurrency(invoice.adjustedAmount)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No invoices</h3>
                    <p className="text-muted-foreground">No invoices have been generated for this project yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}