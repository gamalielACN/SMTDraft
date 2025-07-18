const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { projects, seatRequests, invoices, tickets } = require('../data/mockData');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Get dashboard statistics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const userRole = req.user.role;
      
      // Calculate statistics based on user role
      const stats = {
        pendingTickets: tickets.filter(t => t.currentStatus === 'pending').length,
        pendingSeatRequests: seatRequests.filter(sr => sr.status === 'pending').length,
        projectsEndingSoon: 0, // Would calculate based on end dates
        invoicesPendingConfirmation: invoices.filter(i => i.status === 'pending_approval').length,
        totalProjects: projects.length,
        totalSeats: 17,
        totalEmployees: 20,
        citySummary: [
          { city: 'Jakarta', projects: 1, seats: 10, employees: 12 },
          { city: 'Surabaya', projects: 1, seats: 7, employees: 8 }
        ]
      };

      res.json(stats);
    } else {
      // Database mode - implement actual database queries here
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
  }
});

module.exports = router;