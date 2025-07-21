'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Clock, User, CheckCircle, XCircle, AlertCircle, Building, Users, MapPin } from 'lucide-react';
import { apiClient } from '@/lib/api';
import type { Ticket, SeatInventory, Facility, Project, SeatAssignment } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [activeModule, setActiveModule] = useState('tickets');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [availableSeats, setAvailableSeats] = useState<SeatInventory[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ticketSeatAssignments, setTicketSeatAssignments] = useState<{[email: string]: string}>({});
  const [existingSeatOccupancy, setExistingSeatOccupancy] = useState<SeatAssignment[]>([]);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([]);
  const [localSeatAssignments, setLocalSeatAssignments] = useState<{[email: string]: string}>({});
  const { user, isAuthenticated } = useAuth();
  const [seatSearchTerms, setSeatSearchTerms] = useState<{[email: string]: string}>({});

  // Track which employees are assigned seats (for the new flexible assignment)
  const [assignedEmployees, setAssignedEmployees] = useState<Set<string>>(new Set());

  // BusOps fields for project setup
  const [busOpsFields, setBusOpsFields] = useState({
    seatCountPercent: '70',
    chargedSeatPercent: '70',
    seatRate: '200000'
  });

  // Get project information for display
  const getProjectInfo = (projectId: string | undefined) => {
    if (!projects || projects.length === 0) return null;
    return projects?.find(p => p.id === projectId);
  };

  // Get available seats for a specific facility (same logic as seats page)
  const getSeatsForFacility = (facilityId: string, currentEmployeeEmail?: string) => {
    // First check if project exists and get its metro city
    const project = getProjectInfo(ticket?.projectId);

    // TO DO: currently build failed, check condition where this logic return true
    // if (!project || !facilities || facilities.length === 0) return [];
    
    // Get facility info to check metro city
    const facility = facilities.find(f => f.id === facilityId);
    
    if (!facility || facility.metroCity !== project?.metroCity) {
      return { projectSeats: [], availableSeats: [] }; // Only show seats from facilities in same metro city as project
    }

    // Get current project seat assignments for this facility
    const currentProjectAssignments = seatAssignments?.filter(sa => 
      sa.facilityId === facilityId && 
      sa.projectId === ticket?.projectId && 
      sa.isActive &&
      new Date(sa.endDate) >= new Date() // Not expired
    ) || [];
    
    const projectSeatIds = currentProjectAssignments.map(sa => sa.seatId);
    
    // Get project seats (currently assigned to this project)
    const projectSeats = availableSeats.filter(seat => 
      seat.facilityId === facilityId && projectSeatIds.includes(seat.id)
    );
    
    // Get available seats (not assigned to anyone or assigned to this project)
    const availableSeatsFiltered = availableSeats.filter(seat => {
      if (seat.facilityId !== facilityId) return false;
      
      // Include if it's a project seat
      if (projectSeatIds.includes(seat.id)) return false; // Already in project seats

      // Use same status logic as seats page
      const assignment = seatAssignments?.find(sa => sa.seatId === seat.id && sa.isActive);
      if (!assignment) return true; // Available if no assignment
      
      const today = new Date();
      const startDate = new Date(assignment.startDate);
      const endDate = new Date(assignment.endDate);
      
      // Available if assignment is in the past
      return today > endDate;
    }).filter(seat => {
      // Exclude seats already assigned in current ticket, except for current employee's selection
      const assignedSeatIds = Object.values(ticketSeatAssignments);
      const currentEmployeeAssignedSeat = currentEmployeeEmail ? ticketSeatAssignments[currentEmployeeEmail] : null;
      
      // If this is the current employee's assigned seat, include it
      if (currentEmployeeAssignedSeat === seat.id) {
        return true;
      }
      
      // Otherwise, exclude if assigned to any other employee
      return !assignedSeatIds.includes(seat.id);
    });

    return { projectSeats, availableSeats: availableSeatsFiltered };
  };

  // Get current assignment info for a seat
  const getCurrentSeatAssignment = (seatId: string) => {
    return seatAssignments?.find(sa => 
      sa.seatId === seatId && 
      sa.projectId === ticket?.projectId && 
      sa.isActive &&
      new Date(sa.endDate) >= new Date()
    );
  };

  // Handle seat assignment for employee
  const handleSeatAssignment = (email: string, seatId: string) => {
    setTicketSeatAssignments(prev => {
      const newAssignments = { ...prev };
      
      // Remove this seat from any other employee (prevent duplicates)
      Object.keys(newAssignments).forEach(employeeEmail => {
        if (newAssignments[employeeEmail] === seatId && employeeEmail !== email) {
          delete newAssignments[employeeEmail];
        }
      });
      
      // Assign seat to this employee
      newAssignments[email] = seatId;
      
      return newAssignments;
    });
  };

  const ticketId = params.id as string;

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    router.push('/');
    return null;
  }

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  // Fetch additional data for seat assignment
  useEffect(() => {
    if (ticket?.type === 'seat_allocation') {
      fetchSeatData();
    }
  }, [ticket, user?.role]);

  const fetchSeatData = async () => {
    try {
      const [seatsData, facilitiesData, projectsData, assignmentsData] = await Promise.all([
        apiClient.getSeats(),
        apiClient.getFacilities(),
        apiClient.getProjects(), // Get all projects for project info lookup
        apiClient.getSeatAssignments()
      ]);

      setAvailableSeats(seatsData?.data ?? seatsData);
      setFacilities(facilitiesData);
      // Handle both paginated and direct array responses
      const projects = projectsData.data || projectsData;
      setProjects(Array.isArray(projects) ? projects : []);
      setSeatAssignments(assignmentsData);
    } catch (error) {
      console.error('Failed to fetch seat data:', error);
    }
  };

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getTicket(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!ticket || !comment.trim()) return;
    
    try {
      setIsUpdating(true);
      
      // Handle seat allocation approval
      if (ticket.type === 'seat_allocation') {
        // Validate that exactly seatCount employees have seat assignments
        const assignedCount = Object.keys(ticketSeatAssignments || {}).length;
        const requiredSeatCount = ticket.formData.seatCount || 0;
        
        if (assignedCount !== requiredSeatCount) {
          setError(`Please assign exactly ${requiredSeatCount} seats. Currently assigned: ${assignedCount}`);
          return;
        }
        
        // Create seat requests and assignments for assigned employees only
        const assignedEmployeeEmails = Object.keys(ticketSeatAssignments || {});
        const seatRequestPromises = assignedEmployeeEmails.map(async (email: string, index: number) => {
          const assignedSeatId = ticketSeatAssignments[email];
          
          // Create individual seat request
          const seatRequestData = {
            projectId: ticket.projectId,
            startDate: ticket.formData.startDate,
            endDate: ticket.formData.endDate,
            headcount: 1,
            seatCount: 1,
            employeeEmails: [email],
            employeeIds: [email], // Using email as ID for simplicity
            seatIds: [assignedSeatId],
            projectComments: `Auto-created from ticket #${ticket.id} - ${ticket.formData.reason}`,
            status: 'approved'
          };
          
          return apiClient.createSeatRequest(seatRequestData);
        });
        
        try {
          await Promise.all(seatRequestPromises);
          toast.success('Seat assignments created successfully!', {
            description: `${assignedEmployeeEmails.length} seat request(s) have been created and approved.`
          });
        } catch (seatError) {
          console.error('Failed to create seat requests:', seatError);
          toast.error('Failed to create seat assignments. Please try again.');
          return;
        }
      }
      
      // Update ticket status
      const updatedTicket = await apiClient.updateTicket(ticket.id, {
        currentStatus: 'approved',
        approvalStatus: 'approved',
        busOpsComments: comment.trim(),
        ...(ticket.type === 'project_setup' && { busOpsFields })
      });
      setTicket(updatedTicket);
      setComment('');
      
      // Auto-create project if this is a project_setup ticket
      if (ticket.type === 'project_setup') {
        try {
          // Prepare WBS entries
          const wbsEntries = ticket.formData.wbsEntries?.map((wbs: any, index: number) => ({
            wbsCode: wbs.wbsCode,
            isDefault: wbs.isDefault,
            isActive: wbs.isActive,
            createdDate: new Date().toISOString()
          })) || [
            {
              wbsCode: `WBS-${ticket.formData.projectCode || 'DEFAULT'}-001`,
              isDefault: true,
              isActive: true,
              createdDate: new Date().toISOString()
            }
          ];
          
          const projectData = {
            clientName: ticket.formData.clientName,
            projectName: ticket.formData.projectName,
            projectCode: ticket.formData.projectCode || `${ticket.formData.clientName?.substring(0, 3).toUpperCase()}-${Date.now()}`,
            status: 'active',
            metroCity: ticket.formData.metroCity,
            startDate: ticket.formData.startDate,
            endDate: ticket.formData.endDate,
            deliveryLeadEmail: ticket.formData.deliveryLeadEmail,
            primaryContactEmail: ticket.formData.primaryContactEmail,
            secondaryContactEmail: ticket.formData.secondaryContactEmail || '',
            primaryCPMOEmail: ticket.formData.primaryCPMOEmail || '',
            secondaryCPMOEmail: ticket.formData.secondaryCPMOEmail || '',
            seatCountPercent: parseInt(busOpsFields.seatCountPercent),
            chargedSeatPercent: parseInt(busOpsFields.chargedSeatPercent),
            seatRate: parseInt(busOpsFields.seatRate),
            wbsEntries: wbsEntries
          };
          
          const newProject = await apiClient.createProject(projectData);
          
          // Show success toast
          toast.success(`Project "${newProject.projectName}" created successfully!`, {
            description: 'The project has been automatically created from the approved ticket.',
            action: {
              label: 'View Project',
              onClick: () => router.push(`/projects/${newProject.id}`)
            }
          });
        } catch (projectError) {
          console.error('Failed to create project:', projectError);
          toast.error('Ticket approved but failed to create project. Please create manually.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve ticket');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!ticket || !comment.trim()) return;
    
    try {
      setIsUpdating(true);
      const updatedTicket = await apiClient.updateTicket(ticket.id, {
        currentStatus: 'rejected',
        approvalStatus: 'rejected',
        busOpsComments: comment.trim()
      });
      setTicket(updatedTicket);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject ticket');
    } finally {
      setIsUpdating(false);
    }
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

  const formatType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderClientProjectSection = () => {
    if (!ticket?.formData) return null;

    if (ticket.type === 'project_setup') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Client & Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.formData.clientName && (
                <div>
                  <Label className="text-sm font-medium">Client Name</Label>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.formData.clientName}</p>
                </div>
              )}
              {ticket.formData.projectName && (
                <div>
                  <Label className="text-sm font-medium">Project Name</Label>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.formData.projectName}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.formData.projectCode && (
                <div>
                  <Label className="text-sm font-medium">Project Code</Label>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.formData.projectCode}</p>
                </div>
              )}
              {ticket.formData.metroCity && (
                <div>
                  <Label className="text-sm font-medium">Metro City</Label>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.formData.metroCity}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.formData.startDate && (
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(ticket.formData.startDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {ticket.formData.endDate && (
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(ticket.formData.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (['seat_allocation', 'project_reactivation'].includes(ticket.type) && ticket.projectId) {
      const project = getProjectInfo(ticket?.projectId);
      
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {project ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Project Name</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.projectName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Client Name</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.clientName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Project Code</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.projectCode}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Metro City</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.metroCity}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge className={getStatusColor(project.status)} variant="outline">
                      {project.status}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Seat Rate</Label>
                    <p className="text-sm text-muted-foreground mt-1">Rp {project.seatRate.toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Start Date</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(project.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">End Date</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(project.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Delivery Lead</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.deliveryLeadEmail}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Primary Contact</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.primaryContactEmail}</p>
                  </div>
                </div>
                {(project.secondaryContactEmail || project.primaryCPMOEmail) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.secondaryContactEmail && (
                      <div>
                        <Label className="text-sm font-medium">Secondary Contact</Label>
                        <p className="text-sm text-muted-foreground mt-1">{project.secondaryContactEmail}</p>
                      </div>
                    )}
                    {project.primaryCPMOEmail && (
                      <div>
                        <Label className="text-sm font-medium">Primary CPMO</Label>
                        <p className="text-sm text-muted-foreground mt-1">{project.primaryCPMOEmail}</p>
                      </div>
                    )}
                  </div>
                )}
                {project.secondaryCPMOEmail && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Secondary CPMO</Label>
                      <p className="text-sm text-muted-foreground mt-1">{project.secondaryCPMOEmail}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Seat Count %</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.seatCountPercent}%</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Charged Seat %</Label>
                    <p className="text-sm text-muted-foreground mt-1">{project.chargedSeatPercent}%</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Label className="text-sm font-medium">Project ID</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.projectId}</p>
                <p className="text-sm text-red-500 mt-1">Project details not found</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderProjectInChargeSection = () => {
    if (!ticket?.formData || ticket.type !== 'project_setup') return null;

    const hasContactInfo = ticket.formData.deliveryLeadEmail || 
                          ticket.formData.primaryContactEmail || 
                          ticket.formData.secondaryContactEmail || 
                          ticket.formData.primaryCPMOEmail || 
                          ticket.formData.secondaryCPMOEmail;

    if (!hasContactInfo) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Project in Charge
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ticket.formData.deliveryLeadEmail && (
              <div>
                <Label className="text-sm font-medium">Delivery Lead Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.formData.deliveryLeadEmail}</p>
              </div>
            )}
            {ticket.formData.primaryContactEmail && (
              <div>
                <Label className="text-sm font-medium">Primary Contact Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.formData.primaryContactEmail}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ticket.formData.secondaryContactEmail && (
              <div>
                <Label className="text-sm font-medium">Secondary Contact Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.formData.secondaryContactEmail}</p>
              </div>
            )}
            {ticket.formData.primaryCPMOEmail && (
              <div>
                <Label className="text-sm font-medium">Primary CPMO Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.formData.primaryCPMOEmail}</p>
              </div>
            )}
          </div>
          {ticket.formData.secondaryCPMOEmail && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Secondary CPMO Email</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.formData.secondaryCPMOEmail}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderBusOpsSection = () => {
    if (ticket?.type === 'project_setup' && user?.role === 'business_ops' && ticket.currentStatus === 'pending') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Business Operations Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Please fill in the following fields to complete the project setup approval:
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="seatCountPercent">Seat Count % *</Label>
                <div className="relative">
                  <Input
                    id="seatCountPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={busOpsFields.seatCountPercent}
                    onChange={(e) => setBusOpsFields(prev => ({ ...prev, seatCountPercent: e.target.value }))}
                    className="pr-8"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="chargedSeatPercent">Charged Seat % *</Label>
                <div className="relative">
                  <Input
                    id="chargedSeatPercent"
                    type="number"
                    min="0"
                    max="100"
                    value={busOpsFields.chargedSeatPercent}
                    onChange={(e) => setBusOpsFields(prev => ({ ...prev, chargedSeatPercent: e.target.value }))}
                    className="pr-8"
                    required
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="seatRate">Seat Rate (IDR) *</Label>
                <div className="relative">
                  <Input
                    id="seatRate"
                    type="number"
                    min="0"
                    value={busOpsFields.seatRate}
                    onChange={(e) => setBusOpsFields(prev => ({ ...prev, seatRate: e.target.value }))}
                    className="pl-12"
                    required
                  />
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">IDR</span>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Required for Approval</p>
                  <p className="text-sm text-blue-700">
                    These values will be used for seat allocation calculations and invoice generation.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return null;
  };

  const renderSeatDetailsSection = () => {
    if (!ticket?.formData) return null;

    if (ticket.type === 'seat_allocation') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Seat Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.formData.headcount && (
                <div>
                  <Label className="text-sm font-medium">Headcount</Label>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.formData.headcount}</p>
                </div>
              )}
              {ticket.formData.seatCount && (
                <div>
                  <Label className="text-sm font-medium">Seat Count</Label>
                  <p className="text-sm text-muted-foreground mt-1">{ticket.formData.seatCount}</p>
                </div>
              )}
            </div>
            
            {/* Employee Emails */}
            {ticket.formData.employeeEmails && ticket.formData.employeeEmails.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Employee Emails</Label>
                <div className="mt-1 space-y-1">
                  {ticket.formData.employeeEmails.map((email: string, index: number) => (
                    <p key={`${email}-${index}`} className="text-sm text-muted-foreground">
                      Employee {index + 1}: {email}
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            {ticket.formData.reason && (
              <div>
                <Label className="text-sm font-medium">Reason</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.formData.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    if (ticket.type === 'project_reactivation') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Reactivation Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ticket.formData.reason && (
              <div>
                <Label className="text-sm font-medium">Reason for Reactivation</Label>
                <p className="text-sm text-muted-foreground mt-1">{ticket.formData.reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderSeatAssignmentSection = () => {
    if (!ticket?.formData || ticket.type !== 'seat_allocation' || user?.role !== 'business_ops') {
      return null;
    }

    const employeeEmails = ticket.formData.employeeEmails || [];
    if (employeeEmails.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Seat Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Assign seats to employees. You must assign exactly {ticket.formData.seatCount || 0} seats out of {employeeEmails.length} employees.
          </div>
          
          {/* Start and End Dates */}
          {(ticket.formData.startDate || ticket.formData.endDate) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.formData.startDate && (
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(ticket.formData.startDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {ticket.formData.endDate && (
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(ticket.formData.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {employeeEmails.map((email: string, index: number) => (
              <div key={`${email}-${index}`} className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Employee {index + 1}</Label>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={email}>{email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ticketSeatAssignments?.[email] ? (
                      <>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                          Assigned
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTicketSeatAssignments(prev => {
                              const newAssignments = { ...prev };
                              delete newAssignments[email];
                              return newAssignments;
                            });
                          }}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </div>
                
                {!ticketSeatAssignments?.[email] && (
                  <div>
                    <Label className="text-xs font-medium">Assign Seat</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search seats..."
                        value={seatSearchTerms[email] || ''}
                        onChange={(e) => setSeatSearchTerms(prev => ({ ...prev, [email]: e.target.value }))}
                        className="mt-1 h-8 text-sm mb-1"
                      />
                      <Select 
                        value="" 
                        onValueChange={(value) => handleSeatAssignment(email, value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select seat" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {(() => {
                            const searchTerm = (seatSearchTerms[email] || '').toLowerCase();
                            let hasResults = false;
                            
                            return facilities.map((facility) => {
                              // Only show facilities in same metro city as project
                              const project = getProjectInfo(ticket.projectId);
                              if (!project || facility.metroCity !== project.metroCity) {
                                return null;
                              }

                              const { projectSeats, availableSeats: availableSeatsInFacility } = getSeatsForFacility(facility.id, email);
                              
                              // Filter seats based on search term
                              const filteredProjectSeats = projectSeats.filter(seat =>
                                seat.seatCode.toLowerCase().includes(searchTerm) ||
                                seat.zone.toLowerCase().includes(searchTerm) ||
                                `floor ${seat.floor}`.includes(searchTerm)
                              );
                              
                              const filteredAvailableSeats = availableSeatsInFacility.filter(seat =>
                                seat.seatCode.toLowerCase().includes(searchTerm) ||
                                seat.zone.toLowerCase().includes(searchTerm) ||
                                `floor ${seat.floor}`.includes(searchTerm)
                              );
                              
                              if (filteredProjectSeats.length === 0 && filteredAvailableSeats.length === 0) {
                                return null;
                              }
                              
                              hasResults = true;
                              
                              return (
                                <div key={facility.id}>
                                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                                    {facility.name} - {facility.metroCity}
                                  </div>
                                  
                                  {/* Project Seats First */}
                                  {filteredProjectSeats.length > 0 && (
                                    <>
                                      <div className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50">
                                        🏢 Project Seats ({filteredProjectSeats.length})
                                      </div>
                                      {filteredProjectSeats.map((seat) => {
                                        const currentAssignment = getCurrentSeatAssignment(seat.id);
                                        return (
                                          <SelectItem key={seat.id} value={seat.id}>
                                            <div className="flex items-center justify-between w-full">
                                              <span className="text-sm">{seat.seatCode}</span>
                                              <div className="text-xs text-muted-foreground ml-2">
                                                <div>Floor {seat.floor} • {seat.zone}</div>
                                                {currentAssignment && (
                                                  <div className="text-blue-600">({currentAssignment.employeeId})</div>
                                                )}
                                              </div>
                                            </div>
                                          </SelectItem>
                                        );
                                      })}
                                    </>
                                  )}
                                  
                                  {/* Available Seats */}
                                  {filteredAvailableSeats.length > 0 && (
                                    <>
                                      {filteredProjectSeats.length > 0 && (
                                        <div className="px-2 py-0.5">
                                          <div className="border-t border-muted"></div>
                                        </div>
                                      )}
                                      <div className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50">
                                        ✅ Available Seats ({filteredAvailableSeats.length})
                                      </div>
                                      {filteredAvailableSeats.map((seat) => (
                                        <SelectItem key={seat.id} value={seat.id}>
                                          <div className="flex items-center justify-between w-full">
                                            <span className="text-sm">{seat.seatCode}</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                              Floor {seat.floor} • {seat.zone}
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </>
                                  )}
                                </div>
                              );
                            }).filter(Boolean).concat(
                              // Show "no seats available" message if no results
                              !hasResults && searchTerm ? [
                                <div key="no-results" className="px-2 py-1.5 text-sm text-muted-foreground">
                                  No seats available
                                </div>
                              ] : []
                            );
                          })()}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {ticketSeatAssignments?.[email] && (
                  <div className="text-xs text-muted-foreground">
                    Seat: {availableSeats && availableSeats.find(s => s.id === ticketSeatAssignments?.[email])?.seatCode}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900">Assignment Status</p>
                <p className="text-sm text-blue-700">
                  {Object.keys(ticketSeatAssignments || {}).length} of {ticket.formData.seatCount || 0} required seats assigned
                </p>
                <p className="text-sm text-blue-700">
                  {employeeEmails.length - Object.keys(ticketSeatAssignments || {}).length} employees will remain unassigned
                </p>
                {(() => {
                  const project = getProjectInfo(ticket.projectId);
                  const facilitiesInCity = facilities ? facilities.filter(f => project && f.metroCity === project.metroCity) : [];
                  const totalSeats = facilitiesInCity.reduce((total, facility) => {
                    const { projectSeats, availableSeats } = getSeatsForFacility(facility.id);
                    return total + projectSeats.length + availableSeats.length;
                  }, 0);
                  
                  if (totalSeats === 0 && project) {
                    return (
                      <p className="text-sm text-orange-700 mt-1">
                        ⚠️ No seats available in {project.metroCity}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <AppLayout 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          </div>
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (error || !ticket) {
    return (
      <AppLayout 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Ticket Details</h1>
          </div>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load ticket</h3>
            <p className="text-muted-foreground mb-4">{error || 'Ticket not found'}</p>
            <Button onClick={fetchTicket}>Try Again</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const canTakeAction = user?.role === 'business_ops' && ticket.currentStatus === 'pending';

  return (
    <AppLayout 
      activeModule={activeModule}
      onModuleChange={setActiveModule}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ticket #{ticket.id}</h1>
            <p className="text-muted-foreground">{formatType(ticket.type)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle>Ticket Information</CardTitle>
                  <Badge className={getStatusColor(ticket.currentStatus)}>
                    {ticket.currentStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <div className="mt-1">
                      <Badge className={getTypeColor(ticket.type)}>
                        {formatType(ticket.type)}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(ticket.approvalStatus)}>
                        {ticket.approvalStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(ticket.createdDate)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Last Modified</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDate(ticket.lastModified)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic Sections */}
            {renderClientProjectSection()}
            {renderProjectInChargeSection()}
            {renderBusOpsSection()}
            {renderSeatDetailsSection()}
            {renderSeatAssignmentSection()}

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {ticket.comments.map((comment) => (
                    <div key={comment.id} className="border-l-2 border-muted pl-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">User {comment.userId}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdDate)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.message}</p>
                    </div>
                  ))}
                  {ticket.comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canTakeAction ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="comment">Comment</Label>
                      <Textarea
                        id="comment"
                        placeholder="Add your comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      {ticket.type === 'seat_allocation' ? (
                        <Button
                          onClick={handleApprove}
                          disabled={
                            !comment.trim() || 
                            isUpdating || 
                            (Object.keys(ticketSeatAssignments || {}).length !== (ticket.formData.seatCount || 0))
                          }
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve & Assign Seats
                        </Button>
                      ) : ticket.type === 'project_setup' ? (
                        <Button
                          onClick={handleApprove}
                          disabled={
                            !comment.trim() || 
                            isUpdating ||
                            !busOpsFields.seatCountPercent ||
                            !busOpsFields.chargedSeatPercent ||
                            !busOpsFields.seatRate ||
                            parseInt(busOpsFields.seatCountPercent) < 0 ||
                            parseInt(busOpsFields.seatCountPercent) > 100 ||
                            parseInt(busOpsFields.chargedSeatPercent) < 0 ||
                            parseInt(busOpsFields.chargedSeatPercent) > 100
                          }
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve & Create Project
                        </Button>
                      ) : (
                        <Button
                          onClick={handleApprove}
                          disabled={!comment.trim() || isUpdating}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!comment.trim() || isUpdating}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      {ticket.currentStatus === 'pending' 
                        ? 'Only Business Operations can approve/reject tickets'
                        : `This ticket has been ${ticket.currentStatus}`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <p className="text-sm text-muted-foreground">User {ticket.createdBy}</p>
                </div>
                {ticket.assignedTo && (
                  <div>
                    <Label className="text-sm font-medium">Assigned To</Label>
                    <p className="text-sm text-muted-foreground">User {ticket.assignedTo}</p>
                  </div>
                )}
                {ticket.projectId && (
                  <div>
                    <Label className="text-sm font-medium">Related Project</Label>
                    <p className="text-sm text-muted-foreground">Project {ticket.projectId}</p>
                  </div>
                )}
                {ticket.relatedSeatRequestId && (
                  <div>
                    <Label className="text-sm font-medium">Related Seat Request</Label>
                    <p className="text-sm text-muted-foreground">Request {ticket.relatedSeatRequestId}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}