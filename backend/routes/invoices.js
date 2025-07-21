const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { invoices, projects, seatRequests, holidays } = require('../data/mockData');
const { writeToMockDataFile } = require('../utils/fileWriter');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Helper function to calculate working days between two dates
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  // Get holiday dates for comparison
  const holidayDates = holidays
    .filter(h => h.isActive)
    .map(h => new Date(h.date).toDateString());
  
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
    const isHoliday = holidayDates.includes(date.toDateString());
    
    if (!isWeekend && !isHoliday) {
      workingDays++;
    }
  }
  
  return workingDays;
};

// Helper function to apply filters and pagination
const applyFiltersAndPagination = (invoicesList, query, userRole, userEmail) => {
  let filtered = [...invoicesList];
  
  // Apply role-based filtering first
  if (userRole === 'project_pic') {
    const userProjects = projects.filter(p => 
      p.deliveryLeadEmail === userEmail ||
      p.primaryContactEmail === userEmail ||
      p.secondaryContactEmail === userEmail ||
      p.primaryCPMOEmail === userEmail ||
      p.secondaryCPMOEmail === userEmail
    );
    
    const userProjectIds = userProjects.map(p => p.id);
    filtered = filtered.filter(i => userProjectIds.includes(i.projectId));
  }
  
  // Apply search
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filtered = filtered.filter(invoice => 
      invoice.id.toLowerCase().includes(searchTerm) ||
      invoice.billingPeriod.toLowerCase().includes(searchTerm) ||
      projects.find(p => p.id === invoice.projectId)?.projectName.toLowerCase().includes(searchTerm) ||
      projects.find(p => p.id === invoice.projectId)?.clientName.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply status filter
  if (query.status) {
    filtered = filtered.filter(invoice => invoice.status === query.status);
  }
  
  // Apply project filter
  if (query.project) {
    filtered = filtered.filter(invoice => invoice.projectId === query.project);
  }
  
  // Apply billing period filter
  if (query.billingPeriod) {
    const periodTerm = query.billingPeriod.toLowerCase();
    filtered = filtered.filter(invoice => 
      invoice.billingPeriod.toLowerCase().includes(periodTerm)
    );
  }
  
  // Apply date range filter
  if (query.dateFrom) {
    const fromDate = new Date(query.dateFrom);
    filtered = filtered.filter(invoice => new Date(invoice.generatedDate) >= fromDate);
  }
  
  if (query.dateTo) {
    const toDate = new Date(query.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(invoice => new Date(invoice.generatedDate) <= toDate);
  }
  
  // Calculate pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  
  // Apply pagination
  const paginatedInvoices = filtered.slice(offset, offset + limit);
  
  return {
    data: paginatedInvoices,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

// Get all invoices with search, filter, and pagination
router.get('/', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const result = applyFiltersAndPagination(invoices, req.query, req.user.role, req.user.email);
      res.json(result);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
  }
});

// Generate invoice
router.post('/generate', authenticateToken, authorizeRoles('business_ops', 'admin'), (req, res) => {
  try {
    if (useMockData) {
      const { startDate, endDate, projectName } = req.body;
      
      if (!startDate || !endDate || !projectName) {
        return res.status(400).json({ 
          message: 'Start date, end date, and project name are required' 
        });
      }
      
      // Find project by name
      const project = projects.find(p => 
        p.projectName.toLowerCase() === projectName.toLowerCase()
      );
      
      if (!project) {
        return res.status(404).json({ 
          message: 'Project not found' 
        });
      }
      
      // Get approved seat requests for this project within the date range
      const projectSeatRequests = seatRequests.filter(sr => 
        sr.projectId === project.id && 
        sr.status === 'approved' &&
        new Date(sr.startDate) <= new Date(endDate) &&
        new Date(sr.endDate) >= new Date(startDate)
      );
      
      if (projectSeatRequests.length === 0) {
        return res.status(400).json({ 
          message: 'No approved seat allocations found for this project in the specified period' 
        });
      }
      
      // Sort seat requests by start date to create segments
      projectSeatRequests.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      
      // Create billing segments based on seat allocation changes
      const segments = [];
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      
      // Create segments based on headcount changes
      let currentDate = new Date(periodStart);
      
      while (currentDate <= periodEnd) {
        // Find the active seat request for current date
        const activeRequest = projectSeatRequests
          .filter(sr => 
            new Date(sr.startDate) <= currentDate && 
            new Date(sr.endDate) >= currentDate
          )
          .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0]; // Get latest if multiple
        
        if (activeRequest) {
          // Find when this headcount changes (next seat request start date or period end)
          const nextChange = projectSeatRequests
            .filter(sr => new Date(sr.startDate) > currentDate)
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
          
          const segmentEnd = nextChange 
            ? new Date(Math.min(
                new Date(nextChange.startDate).getTime() - 24 * 60 * 60 * 1000,
                periodEnd.getTime()
              ))
            : new Date(Math.min(
                new Date(activeRequest.endDate).getTime(),
                periodEnd.getTime()
              ));
          
          if (currentDate <= segmentEnd) {
            const workingDays = calculateWorkingDays(currentDate, segmentEnd);
            const chargedSeats = Math.ceil(activeRequest.headcount * (project.chargedSeatPercent / 100));
            const segmentValue = workingDays * chargedSeats * project.seatRate;
            
            segments.push({
              id: String(segments.length + 1),
              startDate: currentDate.toISOString().split('T')[0],
              endDate: segmentEnd.toISOString().split('T')[0],
              headcount: activeRequest.headcount,
              chargedSeat: chargedSeats,
              workingDays: workingDays,
              value: segmentValue
            });
            
            // Move to next segment
            currentDate = new Date(segmentEnd.getTime() + 24 * 60 * 60 * 1000);
          } else {
            break;
          }
        } else {
          // No active request for this date, move to next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      if (segments.length === 0) {
        return res.status(400).json({ 
          message: 'No billable periods found for the specified date range' 
        });
      }
      
      // Calculate total cost
      const totalCost = segments.reduce((sum, segment) => sum + segment.value, 0);
      
      // Create billing period string (YYYY-MM format)
      const billingPeriod = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
      
      // Create new invoice
      const newInvoice = {
        id: String(invoices.length + 1),
        projectId: project.id,
        billingPeriod: billingPeriod,
        startDate: startDate,
        endDate: endDate,
        totalCost: totalCost,
        status: 'pending_approval',
        seatRate: project.seatRate,
        chargedSeatPercent: project.chargedSeatPercent,
        generatedDate: new Date().toISOString(),
        transactions: segments,
        payments: [
          {
            id: '1',
            wbsCode: project.wbsEntries.find(w => w.isDefault)?.wbsCode || 'DEFAULT-WBS',
            amount: totalCost
          }
        ]
      };
      
      invoices.push(newInvoice);
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('invoices', invoices);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.status(201).json(newInvoice);
    } else {
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ message: 'Failed to generate invoice' });
  }
});

// Update invoice (confirm/reject)
router.put('/:id', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const invoiceIndex = invoices.findIndex(i => i.id === req.params.id);
      
      if (invoiceIndex === -1) {
        return res.status(404).json({ message: 'Invoice not found' });
      }
      
      invoices[invoiceIndex] = {
        ...invoices[invoiceIndex],
        ...req.body,
        lastModified: new Date().toISOString(),
        // Set confirmed date if approving
        ...(req.body.status === 'approved' && !invoices[invoiceIndex].confirmedDate && {
          confirmedDate: new Date().toISOString()
        })
      };
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('invoices', invoices);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.json(invoices[invoiceIndex]);
    } else {
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Failed to update invoice' });
  }
});

module.exports = router;