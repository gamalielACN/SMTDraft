'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Building, Users, MapPin, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';
import type { Project } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';

export default function NewTicketPage() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState('tickets');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [approvedTickets, setApprovedTickets] = useState<any[]>([]);
  const [pendingTickets, setPendingTickets] = useState<any[]>([]);

  // Employee emails state (WBS-style)
  const [employeeEmails, setEmployeeEmails] = useState<Array<{
    id: string;
    email: string;
  }>>([
    {
      id: '1',
      email: ''
    }
  ]);
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');

  // WBS entries state
  const [wbsEntries, setWbsEntries] = useState<Array<{
    id: string;
    wbsCode: string;
    isActive: boolean;
    isDefault: boolean;
  }>>([
    {
      id: '1',
      wbsCode: '',
      isActive: true,
      isDefault: true
    }
  ]);
  const [newWbsCode, setNewWbsCode] = useState('');

  // Fetch all tickets on page load
  useEffect(() => {
    const fetchAllTickets = async () => {
      try {
        const response = await apiClient.getTickets();
        const tickets = response.data || response;
        
        const approved = tickets.filter((t: any) => 
          t.type === 'seat_allocation' && t.currentStatus === 'approved'
        );
        const pending = tickets.filter((t: any) => 
          t.type === 'seat_allocation' && t.currentStatus === 'pending'
        );
        
        setApprovedTickets(approved);
        setPendingTickets(pending);
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
      }
    };

    fetchAllTickets();
  }, []);

  const [formData, setFormData] = useState({
    type: '',
    projectId: '',
    clientName: '',
    projectName: '',
    projectCode: '',
    metroCity: '',
    startDate: '',
    endDate: '',
    deliveryLeadEmail: '',
    primaryContactEmail: '',
    secondaryContactEmail: '',
    primaryCPMOEmail: '',
    secondaryCPMOEmail: '',
    headcount: '',
    seatCount: '',
    reason: '',
    description: ''
  });

  // Fetch active projects for seat allocation dropdown
  useEffect(() => {
    const fetchActiveProjects = async () => {
      try {
        const response = await apiClient.getProjects();
        // Handle both paginated and direct array responses
        const projects = response.data || response;
        const active = projects.filter((p: Project) => p.status === 'active');
        setActiveProjects(active);
      } catch (error) {
        console.error('Failed to fetch active projects:', error);
      }
    };

    if (formData.type === 'seat_allocation') {
      fetchActiveProjects();
    }
  }, [formData.type]);

  // Calculate seat count automatically based on project settings
  useEffect(() => {
    if (formData.headcount && formData.type === 'seat_allocation' && selectedProject) {
      const headcount = parseInt(formData.headcount) || 0;
      const seatCountPercent = selectedProject.seatCountPercent || 70;
      const calculatedSeatCount = Math.ceil(headcount * (seatCountPercent / 100));
      setFormData(prev => ({ ...prev, seatCount: calculatedSeatCount.toString() }));
    }
  }, [formData.headcount, formData.type, selectedProject]);

  // Set end date to project end date when project is selected for seat allocation
  useEffect(() => {
    if (formData.type === 'seat_allocation' && formData.projectId) {
      const project = activeProjects.find(p => p.id === formData.projectId);
      if (project) {
        setSelectedProject(project);
        setFormData(prev => ({ 
          ...prev, 
          endDate: project.endDate
        }));
        
        // Pre-populate from latest approved ticket
        const projectApprovedTickets = approvedTickets.filter(t => t.projectId === formData.projectId);
        if (projectApprovedTickets.length > 0) {
          // Get latest approved ticket (highest ID)
          const latestApproved = projectApprovedTickets.reduce((latest, current) => 
            parseInt(current.id) > parseInt(latest.id) ? current : latest
          );
          
          if (latestApproved.formData) {
            setFormData(prev => ({ ...prev, headcount: latestApproved.formData.headcount?.toString() || '' }));
            
            // Pre-populate employee emails
            const existingEmails = latestApproved.formData.employeeEmails || [];
            const emailEntries = existingEmails.map((email: string, index: number) => ({
              id: (index + 1).toString(),
              email: email
            }));
            setEmployeeEmails(emailEntries.length > 0 ? emailEntries : [{ id: '1', email: '' }]);
          }
        }
      } else {
        setSelectedProject(null);
      }
    }
  }, [formData.projectId, formData.type, activeProjects, approvedTickets]);

  const handleInputChange = (field: string, value: string) => {
    // Check for pending seat allocation when selecting ticket type
    if (field === 'type' && value === 'seat_allocation') {
      const hasPendingSeatAllocation = pendingTickets.some(t => 
        t.projectId === formData.projectId && t.type === 'seat_allocation'
      );
      
      if (hasPendingSeatAllocation) {
        setError('You have a pending seat allocation ticket for this project. Please wait for approval/rejection before creating a new one.');
        return;
      } else {
        setError(null);
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Employee Email Management Functions (WBS-style)
  const addEmployeeEmail = () => {
    if (!newEmployeeEmail.trim()) return;
    
    // Check for duplicates
    if (employeeEmails.some(entry => entry.email.toLowerCase() === newEmployeeEmail.toLowerCase())) {
      setError('Employee email already exists');
      return;
    }
    
    const newEntry = {
      id: Date.now().toString(),
      email: newEmployeeEmail.trim()
    };
    
    setEmployeeEmails(prev => [...prev, newEntry]);
    setNewEmployeeEmail('');
    setError(null);
  };

  const removeEmployeeEmail = (id: string) => {
    setEmployeeEmails(prev => prev.filter(entry => entry.id !== id));
  };

  const updateEmployeeEmail = (id: string, newEmail: string) => {
    // Check for duplicates (excluding current entry)
    const isDuplicate = employeeEmails.some(entry => 
      entry.id !== id && entry.email.toLowerCase() === newEmail.toLowerCase()
    );
    
    if (isDuplicate && newEmail.trim()) {
      setError('Employee email already exists');
      return;
    }
    
    setError(null);
    setEmployeeEmails(prev => prev.map(entry => 
      entry.id === id ? { ...entry, email: newEmail } : entry
    ));
  };

  // WBS Management Functions
  const addWbsEntry = () => {
    if (!newWbsCode.trim()) return;
    
    // Check for duplicates
    if (wbsEntries.some(entry => entry.wbsCode.toLowerCase() === newWbsCode.toLowerCase())) {
      setError('WBS code already exists');
      return;
    }
    
    const newEntry = {
      id: Date.now().toString(),
      wbsCode: newWbsCode.trim(),
      isActive: true,
      isDefault: false
    };
    
    setWbsEntries(prev => [...prev, newEntry]);
    setNewWbsCode('');
    setError(null);
  };

  const removeWbsEntry = (id: string) => {
    if (wbsEntries.length <= 1) return; // Keep at least one entry
    
    const entryToRemove = wbsEntries.find(entry => entry.id === id);
    const updatedEntries = wbsEntries.filter(entry => entry.id !== id);
    
    // If removing default entry, make first remaining entry default
    if (entryToRemove?.isDefault && updatedEntries.length > 0) {
      updatedEntries[0].isDefault = true;
      updatedEntries[0].isActive = true;
    }
    
    setWbsEntries(updatedEntries);
  };

  const updateWbsEntry = (id: string, field: string, value: any) => {
    setWbsEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };
        
        // If setting as default, unset others and make it active
        if (field === 'isDefault' && value === true) {
          updated.isActive = true;
          // Unset default for all other entries
          return updated;
        }
        
        // If unsetting active and it's default, prevent it
        if (field === 'isActive' && value === false && entry.isDefault) {
          return entry; // Don't allow deactivating default
        }
        
        return updated;
      } else if (field === 'isDefault' && value === true) {
        // Unset default for other entries
        return { ...entry, isDefault: false };
      }
      return entry;
    }));
  };

  const updateWbsCode = (id: string, newCode: string) => {
    // Check for duplicates (excluding current entry)
    const isDuplicate = wbsEntries.some(entry => 
      entry.id !== id && entry.wbsCode.toLowerCase() === newCode.toLowerCase()
    );
    
    if (isDuplicate && newCode.trim()) {
      setError('WBS code already exists');
      return;
    }
    
    setError(null);
    updateWbsEntry(id, 'wbsCode', newCode);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.type) return;

    try {
      // Validate employee emails for seat allocation
      if (formData.type === 'seat_allocation') {
        const validEmails = employeeEmails.filter(entry => entry.email.trim() !== '');
        const headcount = parseInt(formData.headcount) || 0;
        
        if (validEmails.length !== headcount) {
          const errorMessage = `Number of employee emails (${validEmails.length}) must match headcount (${headcount})`;
          setError(errorMessage);
          toast.error(errorMessage);
          return;
        }
      }
      
      setIsSubmitting(true);
      setError(null);

      // Prepare form data based on ticket type
      let ticketFormData: any = {};
      
      switch (formData.type) {
        case 'project_setup':
          ticketFormData = {
            clientName: formData.clientName,
            projectName: formData.projectName,
            projectCode: formData.projectCode,
            metroCity: formData.metroCity,
            startDate: formData.startDate,
            endDate: formData.endDate,
            deliveryLeadEmail: formData.deliveryLeadEmail,
            primaryContactEmail: formData.primaryContactEmail,
            secondaryContactEmail: formData.secondaryContactEmail,
            primaryCPMOEmail: formData.primaryCPMOEmail,
            secondaryCPMOEmail: formData.secondaryCPMOEmail
          };
          
          // Add WBS entries
          ticketFormData.wbsEntries = wbsEntries.filter(entry => entry.wbsCode.trim());
          break;
        case 'seat_allocation':
          ticketFormData = {
            projectId: formData.projectId,
            startDate: formData.startDate,
            endDate: formData.endDate,
            headcount: parseInt(formData.headcount) || 0,
            seatCount: parseInt(formData.seatCount) || 0,
            employeeEmails: employeeEmails.filter(entry => entry.email.trim() !== '').map(entry => entry.email),
            reason: formData.reason
          };
          break;
        case 'project_reactivation':
          ticketFormData = {
            projectId: formData.projectId,
            reason: formData.reason
          };
          break;
      }

      const newTicket = await apiClient.createTicket({
        type: formData.type,
        projectId: formData.projectId || undefined,
        formData: ticketFormData
      });

      router.push('/tickets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProjectSetupSection = () => {
    if (formData.type === 'project_setup') {
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
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  placeholder="Enter client name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  placeholder="Enter project name"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectCode">Project Code</Label>
                <Input
                  id="projectCode"
                  value={formData.projectCode}
                  onChange={(e) => handleInputChange('projectCode', e.target.value)}
                  placeholder="Enter project code"
                />
              </div>
              <div>
                <Label htmlFor="metroCity">Metro City *</Label>
                <Select value={formData.metroCity} onValueChange={(value) => handleInputChange('metroCity', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jakarta">Jakarta</SelectItem>
                    <SelectItem value="Semarang">Semarang</SelectItem>
                    <SelectItem value="Batam">Batam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (['seat_allocation', 'project_reactivation'].includes(formData.type)) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="projectId">Project *</Label>
              {formData.type === 'seat_allocation' ? (
                <Select value={formData.projectId} onValueChange={(value) => handleInputChange('projectId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select active project" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeProjects.map((project, index) => (
                      <SelectItem key={`${project.projectName}-${project.id}-${index}`} value={project.id}>
                        {project.projectName} ({project.clientName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="projectId"
                  value={formData.projectId}
                  onChange={(e) => handleInputChange('projectId', e.target.value)}
                  placeholder="Enter project ID"
                  required
                />
              )}
            </div>
            
            {/* Project Details Display */}
            {formData.type === 'seat_allocation' && selectedProject && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">Selected Project Details</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 font-medium">Seat Count %:</span>
                    <div className="text-blue-800">{selectedProject.seatCountPercent}%</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Charged Seat %:</span>
                    <div className="text-blue-800">{selectedProject.chargedSeatPercent}%</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Seat Rate:</span>
                    <div className="text-blue-800">Rp {selectedProject.seatRate.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-blue-700 font-medium">Metro City:</span>
                    <div className="text-blue-800">{selectedProject.metroCity}</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderProjectInChargeSection = () => {
    if (formData.type === 'project_setup') {
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
              <div>
                <Label htmlFor="deliveryLeadEmail">Delivery Lead Email *</Label>
                <Input
                  id="deliveryLeadEmail"
                  type="email"
                  value={formData.deliveryLeadEmail}
                  onChange={(e) => handleInputChange('deliveryLeadEmail', e.target.value)}
                  placeholder="delivery.lead@accenture.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="primaryContactEmail">Primary Contact Email *</Label>
                <Input
                  id="primaryContactEmail"
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(e) => handleInputChange('primaryContactEmail', e.target.value)}
                  placeholder="primary.contact@accenture.com"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="secondaryContactEmail">Secondary Contact Email</Label>
                <Input
                  id="secondaryContactEmail"
                  type="email"
                  value={formData.secondaryContactEmail}
                  onChange={(e) => handleInputChange('secondaryContactEmail', e.target.value)}
                  placeholder="secondary.contact@accenture.com"
                />
              </div>
              <div>
                <Label htmlFor="primaryCPMOEmail">Primary CPMO Email</Label>
                <Input
                  id="primaryCPMOEmail"
                  type="email"
                  value={formData.primaryCPMOEmail}
                  onChange={(e) => handleInputChange('primaryCPMOEmail', e.target.value)}
                  placeholder="primary.cpmo@accenture.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="secondaryCPMOEmail">Secondary CPMO Email</Label>
                <Input
                  id="secondaryCPMOEmail"
                  type="email"
                  value={formData.secondaryCPMOEmail}
                  onChange={(e) => handleInputChange('secondaryCPMOEmail', e.target.value)}
                  placeholder="secondary.cpmo@accenture.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderWBSSection = () => {
    if (formData.type === 'project_setup') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              WBS Entries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {wbsEntries.map((entry, index) => (
                  <TableRow key={`${entry.wbsCode}-${entry.id}-${index}`}>
                    <TableCell>
                      <Input
                        value={entry.wbsCode}
                        onChange={(e) => updateWbsCode(entry.id, e.target.value)}
                        placeholder="Enter WBS code"
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={entry.isActive}
                        onCheckedChange={(checked) => updateWbsEntry(entry.id, 'isActive', checked)}
                        disabled={entry.isDefault} // Default entries must be active
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={entry.isDefault}
                        onCheckedChange={(checked) => updateWbsEntry(entry.id, 'isDefault', checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWbsEntry(entry.id)}
                        disabled={wbsEntries.length <= 1}
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
              <p>• First WBS entry is automatically set as default and active</p>
              <p>• Default WBS entries cannot be deactivated</p>
              <p>• Only one WBS can be default at a time</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderSeatDetailsSection = () => {
    if (formData.type === 'seat_allocation') {
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
              <div>
                <Label htmlFor="headcount">Headcount *</Label>
                <Input
                  id="headcount"
                  type="number"
                  className="w-32"
                  value={formData.headcount}
                  onChange={(e) => handleInputChange('headcount', e.target.value)}
                  placeholder="Enter headcount"
                  min="1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="seatCount">Seat Count *</Label>
                <Input
                  id="seatCount"
                  type="number"
                  className="w-32 bg-muted cursor-not-allowed"
                  value={formData.seatCount}
                  onChange={(e) => handleInputChange('seatCount', e.target.value)}
                  placeholder="Enter seat count"
                  min="1"
                  readOnly
                  required
                />
                {selectedProject && formData.headcount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Seat allocation: {formData.seatCount} seats ({selectedProject.seatCountPercent}% of {formData.headcount} headcount as per project policy)
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]} // Cannot be in the past
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                  required
                  readOnly // Auto-populated from project end date
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically set to project end date
                </p>
              </div>
            </div>
            
            {/* Employee Email Fields */}
            {formData.type === 'seat_allocation' && (
              <div>
                <Label>Employee Emails *</Label>
                <div className="mt-2 space-y-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee Email</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeEmails.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Input
                              type="email"
                              value={entry.email}
                              onChange={(e) => updateEmployeeEmail(entry.id, e.target.value)}
                              placeholder="employee@accenture.com"
                              className={`${entry.email && !validateEmail(entry.email) ? 'border-red-500' : ''}`}
                            />
                            {entry.email && !validateEmail(entry.email) && (
                              <p className="text-sm text-red-500 mt-1">Please enter a valid email address</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEmployeeEmail(entry.id)}
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
                      type="email"
                      value={newEmployeeEmail}
                      onChange={(e) => setNewEmployeeEmail(e.target.value)}
                      placeholder="Enter new employee email"
                      className="flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && addEmployeeEmail()}
                    />
                    <Button onClick={addEmployeeEmail} disabled={!newEmployeeEmail.trim()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Email
                    </Button>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>• Add employee emails one by one</p>
                    <p>• Total emails must match headcount for validation</p>
                    <p>• Minimum 0 emails allowed (for projects with no members)</p>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Explain the reason for this seat request"
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    if (formData.type === 'project_reactivation') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Reactivation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason for Reactivation *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Explain why this project needs to be reactivated"
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  // Only Project PICs can create tickets
  if (user?.role !== 'project_pic') {
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
            <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
          </div>
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Only Project PICs can create tickets.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Create New Ticket</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ticket Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="type">Select Ticket Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ticket type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project_setup">Project Setup</SelectItem>
                    <SelectItem value="seat_allocation">Seat Allocation</SelectItem>
                    <SelectItem value="project_reactivation">Project Reactivation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Form Sections */}
          {formData.type && (
            <>
              {renderProjectSetupSection()}
              {renderProjectInChargeSection()}
              {renderWBSSection()}
              {renderSeatDetailsSection()}

              {/* Additional Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="description">Additional Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Any additional information or special requirements"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Submit Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!formData.type || isSubmitting}>
                      <Plus className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Creating...' : 'Create Ticket'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </form>
      </div>
    </AppLayout>
  );
}