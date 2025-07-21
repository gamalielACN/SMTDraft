'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, FileText, Calendar, DollarSign, Building, Users, CheckCircle, Clock, AlertCircle, Download, MessageSquare } from 'lucide-react';
import { apiClient, type ApiError } from '@/lib/api';
import type { Invoice, Project } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  const [activeModule, setActiveModule] = useState('invoices');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [comments, setComments] = useState('');
  const [adjustedAmount, setAdjustedAmount] = useState('');
  const [wbsAmounts, setWbsAmounts] = useState<Record<string, number>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const { user, isAuthenticated } = useAuth();

  const invoiceId = params.id as string;

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

  const fetchInvoiceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const invoiceData = await apiClient.getInvoices();
      // Handle both paginated and direct array responses
      const invoices = invoiceData.data || invoiceData;
      const currentInvoice = Array.isArray(invoices) 
        ? invoices.find((inv: Invoice) => inv.id === invoiceId)
        : null;
      
      if (!currentInvoice) {
        throw new Error('Invoice not found');
      }
      
      setInvoice(currentInvoice);
      setAdjustedAmount(currentInvoice.adjustedAmount?.toString() || '');
      
      // Initialize WBS amounts from current payments
      const initialWbsAmounts: Record<string, number> = {};
      currentInvoice.payments.forEach((payment: any) => {
        initialWbsAmounts[payment.wbsCode] = payment.amount;
      });
      setWbsAmounts(initialWbsAmounts);
      
      // Fetch project data
      const projectData = await apiClient.getProject(currentInvoice.projectId);
      setProject(projectData);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateWbsAmount = (wbsCode: string, amount: number) => {
    setWbsAmounts(prev => ({
      ...prev,
      [wbsCode]: amount
    }));
  };

  const getTotalWbsAmount = () => {
    return Object.values(wbsAmounts).reduce((sum, amount) => sum + (amount || 0), 0);
  };

  const isWbsValidationError = () => {
    if (!invoice) return false;
    const totalWbs = getTotalWbsAmount();
    const invoiceTotal = invoice.totalCost;
    return Math.abs(totalWbs - invoiceTotal) > 0.01; // Allow for small floating point differences
  };

  const handleApprove = async () => {
    if (!invoice) return;
    
    if (isWbsValidationError()) {
      toast.error('WBS amounts must equal invoice total');
      return;
    }
    
    try {
      setIsUpdating(true);
      await apiClient.updateInvoice(invoice.id, {
        status: 'approved',
        confirmedBy: user?.id,
        confirmedDate: new Date().toISOString(),
        projectComments: comments,
        adjustedAmount: adjustedAmount ? parseFloat(adjustedAmount) : undefined
      });
      
      await fetchInvoiceData();
    } catch (error) {
      console.error('Failed to approve invoice:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!invoice) return;
    
    try {
      setIsUpdating(true);
      await apiClient.updateInvoice(invoice.id, {
        status: 'pending_revision',
        projectComments: comments
      });
      
      await fetchInvoiceData();
    } catch (error) {
      console.error('Failed to request revision:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending_revision': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const InvoiceDetailSkeleton = () => (
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
    </div>
  );

  if (isLoading) {
    return (
      <AppLayout 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      >
        <InvoiceDetailSkeleton />
      </AppLayout>
    );
  }

  if (error || !invoice) {
    return (
      <AppLayout 
        activeModule={activeModule}
        onModuleChange={setActiveModule}
      >
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/invoices')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Invoice Details</h1>
          </div>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load invoice</h3>
            <p className="text-muted-foreground mb-4">{error?.message || 'Invoice not found'}</p>
            <Button onClick={fetchInvoiceData}>Try Again</Button>
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
            onClick={() => router.push('/invoices')}
            className="hover:bg-accenture-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gradient">Invoice #{invoice.id}</h1>
            <p className="text-muted-foreground">{project?.projectName} - {project?.clientName}</p>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status.replace('_', ' ')}
          </Badge>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="data-[state=active]:bg-accenture-500 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="line-items" className="data-[state=active]:bg-accenture-500 data-[state=active]:text-white">
              Line Items & Approval
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-accenture-500 data-[state=active]:text-white">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Invoice Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Invoice Information */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accenture-500" />
                    Invoice Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Invoice ID</span>
                    <span className="text-sm text-muted-foreground">#{invoice.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Billing Period</span>
                    <span className="text-sm text-muted-foreground">{invoice.billingPeriod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Generated Date</span>
                    <span className="text-sm text-muted-foreground">{formatDate(invoice.generatedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Status</span>
                    <Badge className={getStatusColor(invoice.status)} variant="outline">
                      {invoice.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Project Information */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-accenture-500" />
                    Project Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Client Name</span>
                    <span className="text-sm text-muted-foreground">{project?.clientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Project Name</span>
                    <span className="text-sm text-muted-foreground">{project?.projectName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Project Code</span>
                    <span className="text-sm text-muted-foreground">{project?.projectCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Metro City</span>
                    <span className="text-sm text-muted-foreground">{project?.metroCity}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accenture-500" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Cost</span>
                    <span className="text-sm font-bold text-accenture-600">{formatCurrency(invoice.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Seat Rate</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(invoice.seatRate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Charged Seat %</span>
                    <span className="text-sm text-muted-foreground">{invoice.chargedSeatPercent}%</span>
                  </div>
                  {invoice.adjustedAmount && (
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-sm font-medium">Adjusted Amount</span>
                      <span className="text-sm font-bold text-orange-600">{formatCurrency(invoice.adjustedAmount)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Period Information */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accenture-500" />
                  Billing Period Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Start Date</span>
                      <span className="text-sm text-muted-foreground">{formatDate(invoice.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">End Date</span>
                      <span className="text-sm text-muted-foreground">{formatDate(invoice.endDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Duration</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.ceil((new Date(invoice.endDate).getTime() - new Date(invoice.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                      </span>
                    </div>
                  </div>
                  
                  {invoice.confirmedDate && (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Confirmed Date</span>
                        <span className="text-sm text-muted-foreground">{formatDate(invoice.confirmedDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Confirmed By</span>
                        <span className="text-sm text-muted-foreground">User {invoice.confirmedBy}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="line-items" className="space-y-6">
            {/* Seat Allocation Segments */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accenture-500" />
                  Seat Allocation Segments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Headcount</TableHead>
                      <TableHead>Charged Seats</TableHead>
                      <TableHead>Working Days</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.transactions.map((transaction, index) => (
                      <TableRow key={`${transaction.id}-${index}`} className="hover:bg-accenture-50/50">
                        <TableCell className="font-medium">Segment {index + 1}</TableCell>
                        <TableCell>{formatDate(transaction.startDate)}</TableCell>
                        <TableCell>{formatDate(transaction.endDate)}</TableCell>
                        <TableCell>{transaction.headcount}</TableCell>
                        <TableCell>{transaction.chargedSeat}</TableCell>
                        <TableCell>{transaction.workingDays}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(transaction.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="mt-4 p-4 bg-accenture-50 border border-accenture-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-accenture-900">Total Invoice Amount:</span>
                    <span className="text-xl font-bold text-accenture-700">{formatCurrency(invoice.totalCost)}</span>
                  </div>
                  {invoice.adjustedAmount && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-medium text-orange-900">Adjusted Amount:</span>
                      <span className="text-xl font-bold text-orange-700">{formatCurrency(invoice.adjustedAmount)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Invoice Approval Section */}
            {invoice.status === 'pending_approval' && user?.role === 'project_pic' && (
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-accenture-500" />
                    Invoice Approval
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* WBS Payment Split */}
                  <div>
                    <Label className="text-base font-medium">WBS Payment Split</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Split the invoice amount across WBS codes. Total must equal {formatCurrency(invoice.totalCost)}.
                    </p>
                    
                    <div className="space-y-3">
                      {project?.wbsEntries.map((wbs, index) => {
                        const currentAmount = wbsAmounts[wbs.wbsCode] || (index === 0 ? invoice.totalCost : 0);
                        
                        return (
                          <div key={`${wbs.id}-${wbs.wbsCode}-${index}`} className="flex items-center space-x-4 p-3 border rounded-lg">
                            <div className="flex-1">
                              <div className="font-medium">{wbs.wbsCode}</div>
                              {wbs.isDefault && (
                                <Badge variant="outline" className="text-xs mt-1">Default</Badge>
                              )}
                            </div>
                            <div className="w-48">
                              <Input
                                type="number"
                                placeholder="0"
                                value={currentAmount}
                                onChange={(e) => {
                                  const newAmount = parseFloat(e.target.value) || 0;
                                  updateWbsAmount(wbs.wbsCode, newAmount);
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className={`mt-4 p-3 rounded-lg border ${
                      isWbsValidationError() 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className={`font-medium ${
                          isWbsValidationError() ? 'text-red-900' : 'text-blue-900'
                        }`}>Total Allocated:</span>
                        <span className={`font-bold ${
                          isWbsValidationError() ? 'text-red-700' : 'text-blue-700'
                        }`}>
                          {formatCurrency(getTotalWbsAmount())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className={`font-medium ${
                          isWbsValidationError() ? 'text-red-900' : 'text-blue-900'
                        }`}>Invoice Amount:</span>
                        <span className={`font-bold ${
                          isWbsValidationError() ? 'text-red-700' : 'text-blue-700'
                        }`}>{formatCurrency(invoice.totalCost)}</span>
                      </div>
                      {isWbsValidationError() && (
                        <div className="mt-2 text-sm text-red-600">
                          ⚠️ WBS amounts must equal invoice total. Difference: {formatCurrency(Math.abs(getTotalWbsAmount() - invoice.totalCost))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Comments and Adjusted Amount */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="comments">Comments</Label>
                      <Textarea
                        id="comments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Add your comments about this invoice..."
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="adjustedAmount">Adjusted Amount (Optional)</Label>
                      <Input
                        id="adjustedAmount"
                        type="number"
                        value={adjustedAmount}
                        onChange={(e) => setAdjustedAmount(e.target.value)}
                        placeholder="Enter adjusted amount if different"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Leave empty to use calculated amount: {formatCurrency(invoice.totalCost)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Approval Actions */}
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button 
                      onClick={handleApprove}
                      disabled={isUpdating || isWbsValidationError()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isUpdating ? 'Approving...' : 'Approve Invoice'}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleRequestRevision}
                      disabled={isUpdating}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {isUpdating ? 'Requesting...' : 'Request Revision'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Current WBS Payment Breakdown */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-accenture-500" />
                  Current WBS Payment Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>WBS Code</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment, index) => (
                      <TableRow key={`${payment.id}-${payment.wbsCode}-${index}`} className="hover:bg-accenture-50/50">
                        <TableCell className="font-medium">{payment.wbsCode}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{((payment.amount / invoice.totalCost) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            {/* Approval History */}
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accenture-500" />
                  Approval History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Invoice Generated</span>
                        <span className="text-sm text-muted-foreground">{formatDate(invoice.generatedDate)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Invoice automatically generated for billing period {invoice.billingPeriod}
                      </p>
                    </div>
                  </div>
                  
                  {invoice.status === 'approved' && invoice.confirmedDate && (
                    <div className="flex items-start space-x-3 p-3 border rounded-lg bg-green-50">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-green-800">Invoice Approved</span>
                          <span className="text-sm text-muted-foreground">{formatDate(invoice.confirmedDate)}</span>
                        </div>
                        <p className="text-sm text-green-700">
                          Approved by User {invoice.confirmedBy}
                        </p>
                        {invoice.projectComments && (
                          <p className="text-sm text-green-700 mt-1">
                            Comments: {invoice.projectComments}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {invoice.status === 'pending_revision' && (
                    <div className="flex items-start space-x-3 p-3 border rounded-lg bg-orange-50">
                      <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-orange-800">Revision Requested</span>
                          <span className="text-sm text-muted-foreground">Recent</span>
                        </div>
                        <p className="text-sm text-orange-700">
                          Invoice requires revision before approval
                        </p>
                        {invoice.projectComments && (
                          <p className="text-sm text-orange-700 mt-1">
                            Comments: {invoice.projectComments}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}