const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { seatInventory, facilities, seatTypes, seatRequests, getSeatAssignments } = require('../data/mockData');
const { writeToMockDataFile } = require('../utils/fileWriter');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Helper function to apply filters and pagination
const applyFiltersAndPagination = (seatsList, query) => {
  let filtered = [...seatsList];
  
  // Apply search
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filtered = filtered.filter(seat => 
      seat.seatCode.toLowerCase().includes(searchTerm) ||
      seat.zone.toLowerCase().includes(searchTerm) ||
      facilities.find(f => f.id === seat.facilityId)?.name.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply facility filter
  if (query.facility) {
    filtered = filtered.filter(seat => seat.facilityId === query.facility);
  }
  
  // Apply floor filter
  if (query.floor) {
    const floorNum = parseInt(query.floor);
    filtered = filtered.filter(seat => seat.floor === floorNum);
  }
  
  // Apply zone filter
  if (query.zone) {
    const zoneTerm = query.zone.toLowerCase();
    filtered = filtered.filter(seat => seat.zone.toLowerCase().includes(zoneTerm));
  }
  
  // Calculate pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  
  // Apply pagination
  const paginatedSeats = filtered.slice(offset, offset + limit);
  
  return {
    data: paginatedSeats,
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

// Get seat assignments
router.get('/assignments', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const assignments = getSeatAssignments();
      res.json(assignments);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get seat assignments error:', error);
    res.status(500).json({ message: 'Failed to fetch seat assignments' });
  }
});

// Get all seats with search, filter, and pagination
router.get('/', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const result = applyFiltersAndPagination(seatInventory, req.query);
      res.json(result);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get seats error:', error);
    res.status(500).json({ message: 'Failed to fetch seats' });
  }
});

// Get seat requests
router.get('/requests', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      let filteredRequests = seatRequests;
      
      // Project PICs see only their requests
      if (req.user.role === 'project_pic') {
        filteredRequests = seatRequests.filter(sr => sr.requestorId === req.user.id);
      }
      
      res.json(filteredRequests);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get seat requests error:', error);
    res.status(500).json({ message: 'Failed to fetch seat requests' });
  }
});

// Create seat request
router.post('/requests', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const newRequest = {
        id: String(seatRequests.length + 1),
        ...req.body,
        requestorId: req.user.id,
        status: req.body.status || 'pending', // Allow status to be set from request
        createdDate: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      seatRequests.push(newRequest);
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('seatRequests', seatRequests);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.status(201).json(newRequest);
    } else {
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Create seat request error:', error);
    res.status(500).json({ message: 'Failed to create seat request' });
  }
});

module.exports = router;