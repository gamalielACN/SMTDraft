'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, MapPin, Building, Download, Calendar, AlertCircle, Filter, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { API_BASE_URL, apiClient, type ApiError } from '@/lib/api';
import type { SeatInventory, Facility, SeatType, Project, SeatAssignment } from '@/lib/types';

interface SeatsPageProps {
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

export function SeatsPage({ userRole }: SeatsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [facilityFilter, setFacilityFilter] = useState('');
  const [floorFilter, setFloorFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [seats, setSeats] = useState<SeatInventory[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [seatTypes, setSeatTypes] = useState<SeatType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [seatAssignments, setSeatAssignments] = useState<SeatAssignment[]>([]);
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
      if (facilityFilter && facilityFilter !== 'all') params.append('facility', facilityFilter);
      if (floorFilter) params.append('floor', floorFilter);
      if (zoneFilter) params.append('zone', zoneFilter);
      
      const [seatsResponse, facilitiesData, seatTypesData, projectsData, assignmentsData] = await Promise.all([
        fetch(`${API_BASE_URL || 'http://localhost:3001/api'}/seats?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        }),
        apiClient.getFacilities(),
        apiClient.getSeatTypes(),
        apiClient.getProjects(),
        apiClient.getSeatAssignments()
      ]);
      
      if (!seatsResponse.ok) {
        throw new Error('Failed to fetch seats');
      }
      
      const seatsData = await seatsResponse.json();
      setSeats(seatsData.data);
      setPagination(seatsData.pagination);
      setFacilities(facilitiesData);
      setSeatTypes(seatTypesData);
      // Handle both paginated and direct array responses
      const projects = projectsData.data || projectsData;
      setProjects(Array.isArray(projects) ? projects : []);
      setSeatAssignments(assignmentsData);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, facilityFilter, floorFilter, zoneFilter, pagination.limit]);

  useEffect(() => {
    fetchData(1);
  }, [searchTerm, facilityFilter, floorFilter, zoneFilter]);

  const handlePageChange = (newPage: number) => {
    fetchData(newPage);
  };
  
  const getFacilityName = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    return facility ? facility.name : 'Unknown Facility';
  };

  const getFacilityCity = (facilityId: string) => {
    const facility = facilities.find(f => f.id === facilityId);
    return facility ? facility.metroCity : 'Unknown City';
  };

  const getSeatTypeName = (seatTypeId: string) => {
    const seatType = seatTypes.find(st => st.id === seatTypeId);
    return seatType ? seatType.name : 'Unknown Type';
  };

  const getSeatAssignment = (seatId: string) => {
    const checkDate = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);
    
    // Find all assignments for this seat
    const seatAssignmentsForSeat = seatAssignments.filter(sa => sa.seatId === seatId);
    
    // Check if any assignment covers the selected date (occupied)
    const currentAssignment = seatAssignmentsForSeat.find(sa => {
      const startDate = new Date(sa.startDate);
      const endDate = new Date(sa.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
    
    if (currentAssignment) {
      return currentAssignment;
    }
    
    // Check if there's a future assignment (booked)
    const futureAssignment = seatAssignmentsForSeat.find(sa => {
      const startDate = new Date(sa.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      return checkDate < startDate;
    });
    
    return futureAssignment;
  };

  const getProjectInfo = (projectId: string) => {
    return projects.find(p => p.id === projectId);
  };

  const getSeatStatus = (seatId: string) => {
    const checkDate = new Date(selectedDate);
    checkDate.setHours(0, 0, 0, 0);
    
    // Find all assignments for this seat
    const seatAssignmentsForSeat = seatAssignments.filter(sa => sa.seatId === seatId);
    
    // Check if any assignment covers the selected date
    const activeAssignment = seatAssignmentsForSeat.find(sa => {
      const startDate = new Date(sa.startDate);
      const endDate = new Date(sa.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
    
    if (activeAssignment) {
      return 'occupied';
    }
    
    // Check if there's a future assignment (booked)
    const futureAssignment = seatAssignmentsForSeat.find(sa => {
      const startDate = new Date(sa.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      return checkDate < startDate;
    });
    
    if (futureAssignment) {
      return 'booked';
    }
    
    return 'available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'occupied':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'booked':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  const TableSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading && seats.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-24" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-20" />
            {userRole === 'business_ops' && <Skeleton className="h-9 w-32" />}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <TableSkeleton />
      </div>
    );
  }

  if (error && seats.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Seats</h1>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load seats</h3>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => fetchData(1)}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Seats</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          {userRole === 'business_ops' && (
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline View
            </Button>
          )}
        </div>
      </div>

      {/* Date Selection */}
      <Card className="border-accenture-200 bg-accenture-50/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CalendarDays className="h-5 w-5 text-accenture-600" />
                <span className="font-medium text-accenture-900">Viewing seat status for:</span>
              </div>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal border-accenture-300 hover:bg-accenture-100"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formatSelectedDate(selectedDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        setIsCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {!isToday(selectedDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-accenture-600 hover:text-accenture-700 hover:bg-accenture-100"
                >
                  Back to Today
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span>Booked</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search seats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={facilityFilter} onValueChange={setFacilityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Facilities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Facilities</SelectItem>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Floor..."
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="w-24"
            />
            <Input
              placeholder="Zone..."
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
      </div>

      {/* Seats Table */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accenture-500" />
            Seat Inventory ({pagination.total} seats)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {seats.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seat Code</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Metro City</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seats.map((seat, index) => {
                    const assignment = getSeatAssignment(seat.id);
                    const project = assignment ? getProjectInfo(assignment.projectId) : null;
                    const status = getSeatStatus(seat.id);
                    
                    return (
                      <TableRow key={`${seat.id}-${seat.facilityId}-${index}`} className="hover:bg-accenture-50/50">
                        <TableCell className="font-medium">{seat.seatCode}</TableCell>
                        <TableCell>{getFacilityName(seat.facilityId)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Floor {seat.floor}</div>
                            <div className="text-muted-foreground">{seat.zone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {project ? (
                            <span className="text-sm">{project.clientName}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {project ? (
                            <span className="text-sm">{project.projectName}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {project ? (
                            <span className="text-sm">{project.metroCity}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment && (status === 'occupied' || status === 'booked') ? (
                            <span className="text-sm">{formatDate(assignment.startDate)}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment && (status === 'occupied' || status === 'booked') ? (
                            <span className="text-sm">{formatDate(assignment.endDate)}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(status)} variant="outline">
                            {status.charAt(0).toUpperCase() + status.slice(1)}
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
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} seats
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
                            key={`seat-page-${pageNum}`}
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
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No seats found</h3>
              <p className="text-muted-foreground">
                {searchTerm || facilityFilter || floorFilter || zoneFilter 
                  ? 'Try adjusting your search criteria or filters' 
                  : 'No seats are available in the system'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}