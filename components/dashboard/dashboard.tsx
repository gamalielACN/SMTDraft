'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ClipboardList, 
  MapPin, 
  Calendar, 
  FileText, 
  Users, 
  Building,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { apiClient, type ApiError } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

interface DashboardProps {
  userRole: string;
}

export function Dashboard({ userRole }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const StatCardSkeleton = () => (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-1/2 mb-1" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );

  const CityCardSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-8" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        {/* Key Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        
        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        
        {/* City Overview Skeleton */}
        <div>
          <Skeleton className="h-7 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(2)].map((_, i) => <CityCardSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load dashboard</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button
            onClick={fetchStats}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    trend 
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    color: string;
    trend?: string;
  }) => (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gradient">{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );

  const CityCard = ({ city, projects, seats, employees }: { 
    city: string; 
    projects: number; 
    seats: number; 
    employees: number; 
  }) => (
    <Card className="card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building className="h-5 w-5 text-accenture-500" />
          {city}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Projects</span>
          <Badge variant="outline" className="border-accenture-200 text-accenture-700">{projects}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Seats</span>
          <Badge variant="outline" className="border-accenture-200 text-accenture-700">{seats}</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Employees</span>
          <Badge variant="outline" className="border-accenture-200 text-accenture-700">{employees}</Badge>
        </div>
        <div className="pt-2">
          <div className="text-xs text-muted-foreground mb-1">Utilization</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-accenture-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${(seats / (seats + 10)) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Badge variant="outline" className="text-sm">
          {userRole === 'project_pic' ? 'Project PIC' : 
           userRole === 'business_ops' ? 'Business Operations' : 'Admin'}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pending Tickets"
          value={stats.pendingTickets}
          icon={ClipboardList}
          color="text-orange-500"
          trend={stats.pendingTickets > 0 ? "Requires attention" : "All up to date"}
        />
        <StatCard
          title="Pending Seat Requests"
          value={stats.pendingSeatRequests}
          icon={MapPin}
          color="text-blue-500"
          trend={stats.pendingSeatRequests > 0 ? "Awaiting approval" : "No pending requests"}
        />
        <StatCard
          title="Projects Ending Soon"
          value={stats.projectsEndingSoon}
          icon={Calendar}
          color="text-red-500"
          trend="Within 30 days"
        />
        <StatCard
          title="Invoices Pending"
          value={stats.invoicesPendingConfirmation}
          icon={FileText}
          color="text-green-500"
          trend={stats.invoicesPendingConfirmation > 0 ? "Confirmation needed" : "All confirmed"}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Projects</span>
              <span className="text-2xl font-bold">{stats.totalProjects}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Allocated Seats</span>
              <span className="text-2xl font-bold">{stats.totalSeats}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Employees</span>
              <span className="text-2xl font-bold">{stats.totalEmployees}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Latest:</span> New seat request submitted
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Latest:</span> Invoice generated for Project DTI-001
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Latest:</span> Project setup ticket approved
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-primary cursor-pointer hover:underline">
              Create New Project
            </div>
            <div className="text-sm text-primary cursor-pointer hover:underline">
              Submit Seat Request
            </div>
            <div className="text-sm text-primary cursor-pointer hover:underline">
              Review Pending Invoices
            </div>
            <div className="text-sm text-primary cursor-pointer hover:underline">
              View All Tickets
            </div>
          </CardContent>
        </Card>
      </div>

      {/* City Summary */}
      <div>
        <h2 className="text-xl font-semibold mb-4">City Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.citySummary.map((city, index) => (
            <CityCard key={`${city.city}-${index}`} {...city} />
          ))}
        </div>
      </div>
    </div>
  );
}