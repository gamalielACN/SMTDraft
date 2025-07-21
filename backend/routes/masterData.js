const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { facilities, holidays, seatTypes } = require('../data/mockData');
const { writeToMockDataFile } = require('../utils/fileWriter');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Get facilities
router.get('/facilities', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      res.json(facilities);
    } else {
      // Database mode - implement actual database queries here
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get facilities error:', error);
    res.status(500).json({ message: 'Failed to fetch facilities' });
  }
});

// Get holidays
router.get('/holidays', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      res.json(holidays);
    } else {
      // Database mode - implement actual database queries here
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({ message: 'Failed to fetch holidays' });
  }
});

// Get seat types
router.get('/seat-types', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      res.json(seatTypes);
    } else {
      // Database mode - implement actual database queries here
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get seat types error:', error);
    res.status(500).json({ message: 'Failed to fetch seat types' });
  }
});

// Create facility (Business Ops/Admin only)
router.post('/facilities', authenticateToken, authorizeRoles('business_ops', 'admin'), (req, res) => {
  try {
    if (useMockData) {
      const newFacility = {
        id: String(facilities.length + 1),
        ...req.body
      };
      
      facilities.push(newFacility);
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('facilities', facilities);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.status(201).json(newFacility);
    } else {
      // Database mode - implement actual database inserts here
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Create facility error:', error);
    res.status(500).json({ message: 'Failed to create facility' });
  }
});

// Create holiday (Business Ops/Admin only)
router.post('/holidays', authenticateToken, authorizeRoles('business_ops', 'admin'), (req, res) => {
  try {
    if (useMockData) {
      const newHoliday = {
        id: String(holidays.length + 1),
        ...req.body
      };
      
      holidays.push(newHoliday);
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('holidays', holidays);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.status(201).json(newHoliday);
    } else {
      // Database mode - implement actual database inserts here
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Create holiday error:', error);
    res.status(500).json({ message: 'Failed to create holiday' });
  }
});

module.exports = router;