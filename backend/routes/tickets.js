const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { tickets, projects, seatRequests } = require('../data/mockData');
const { writeToMockDataFile } = require('../utils/fileWriter');
const { updateSeatAssignments, removeEmployeesFromProject } = require('../utils/seatAssignmentManager');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Helper function to apply filters and pagination
const applyFiltersAndPagination = (ticketsList, query, userRole, userId) => {
  let filtered = [...ticketsList];
  
  // Apply role-based filtering first
  if (userRole === 'project_pic') {
    filtered = filtered.filter(t => t.createdBy === userId);
  }
  
  // Apply search
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filtered = filtered.filter(ticket => 
      ticket.id.toLowerCase().includes(searchTerm) ||
      ticket.type.toLowerCase().includes(searchTerm) ||
      (ticket.projectId && projects.find(p => p.id === ticket.projectId)?.projectName.toLowerCase().includes(searchTerm))
    );
  }
  
  // Apply status filter
  if (query.status) {
    filtered = filtered.filter(ticket => ticket.currentStatus === query.status);
  }
  
  // Apply type filter
  if (query.type) {
    filtered = filtered.filter(ticket => ticket.type === query.type);
  }
  
  // Apply date range filter
  if (query.dateFrom) {
    const fromDate = new Date(query.dateFrom);
    filtered = filtered.filter(ticket => new Date(ticket.createdDate) >= fromDate);
  }
  
  if (query.dateTo) {
    const toDate = new Date(query.dateTo);
    toDate.setHours(23, 59, 59, 999); // End of day
    filtered = filtered.filter(ticket => new Date(ticket.createdDate) <= toDate);
  }
  
  // Apply created by filter
  if (query.createdBy) {
    filtered = filtered.filter(ticket => ticket.createdBy === query.createdBy);
  }
  
  // Calculate pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  
  // Apply pagination
  const paginatedTickets = filtered.slice(offset, offset + limit);
  
  return {
    data: paginatedTickets,
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

// Get all tickets with search, filter, and pagination
router.get('/', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const result = applyFiltersAndPagination(tickets, req.query, req.user.role, req.user.id);
      res.json(result);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

// Get ticket by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const ticket = tickets.find(t => t.id === req.params.id);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      // Check access permissions
      if (req.user.role === 'project_pic' && ticket.createdBy !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(ticket);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
});

// Create new ticket
router.post('/', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      // Validate employee emails for seat allocation tickets
      if (req.body.type === 'seat_allocation' && req.body.formData) {
        const { employeeEmails, headcount, seatCount, startDate, endDate } = req.body.formData;
        
        // Validate required fields for seat allocation
        if (!startDate || !endDate) {
          return res.status(400).json({ 
            message: 'Start date and end date are required for seat allocation requests' 
          });
        }
        
        // Validate date logic
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        
        if (start < today.setHours(0, 0, 0, 0)) {
          return res.status(400).json({ 
            message: 'Start date cannot be in the past' 
          });
        }
        
        if (end <= start) {
          return res.status(400).json({ 
            message: 'End date must be after start date' 
          });
        }
        
        // Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of employeeEmails || []) {
          if (email && !emailRegex.test(email)) {
            return res.status(400).json({ 
              message: `Invalid email format: ${email}` 
            });
          }
        }
      }
      
      const newTicket = {
        id: String(tickets.length + 1),
        ...req.body,
        createdBy: req.user.id,
        currentStatus: 'pending',
        approvalStatus: 'pending',
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        comments: []
      };
      
      tickets.push(newTicket);
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('tickets', tickets);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.status(201).json(newTicket);
    } else {
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Failed to create ticket' });
  }
});

// Update ticket (approve/reject)
router.put('/:id', authenticateToken, authorizeRoles('business_ops', 'admin'), (req, res) => {
  try {
    if (useMockData) {
      const ticketIndex = tickets.findIndex(t => t.id === req.params.id);
      
      if (ticketIndex === -1) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      const oldTicket = { ...tickets[ticketIndex] };
      tickets[ticketIndex] = {
        ...tickets[ticketIndex],
        ...req.body,
        lastModified: new Date().toISOString()
      };
      
      // If seat allocation ticket is being approved, update seat assignments
      if (tickets[ticketIndex].type === 'seat_allocation' && 
          tickets[ticketIndex].currentStatus === 'approved' && 
          oldTicket.currentStatus !== 'approved') {
        
        const { getSeatAssignments } = require('../data/mockData');
        let seatAssignments = getSeatAssignments();
        
        // Update seat assignments based on the approved ticket
        seatAssignments = updateSeatAssignments(tickets[ticketIndex], seatAssignments);
        
        // Remove employees that are no longer in the project
        removeEmployeesFromProject(tickets[ticketIndex], tickets);
        
        // Note: In a real database, we would update the seat_assignments table
        // For mock data, the assignments are generated dynamically from approved tickets
      }
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('tickets', tickets);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.json(tickets[ticketIndex]);
    } else {
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Failed to update ticket' });
  }
});

module.exports = router;