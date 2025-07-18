const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { invoices, projects } = require('../data/mockData');
const { writeToMockDataFile } = require('../utils/fileWriter');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Get all invoices (filtered by user role)
router.get('/', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      let filteredInvoices = invoices;
      
      // Project PICs see only their project invoices
      if (req.user.role === 'project_pic') {
        const userProjects = projects.filter(p => 
          p.deliveryLeadEmail === req.user.email ||
          p.primaryContactEmail === req.user.email ||
          p.secondaryContactEmail === req.user.email ||
          p.primaryCPMOEmail === req.user.email ||
          p.secondaryCPMOEmail === req.user.email
        );
        
        const userProjectIds = userProjects.map(p => p.id);
        filteredInvoices = invoices.filter(i => userProjectIds.includes(i.projectId));
      }
      
      res.json(filteredInvoices);
    } else {
      // Database mode - implement actual database queries here
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Failed to fetch invoices' });
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
        lastModified: new Date().toISOString()
      };
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('invoices', invoices);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.json(invoices[invoiceIndex]);
    } else {
      // Database mode - implement actual database updates here
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ message: 'Failed to update invoice' });
  }
});

module.exports = router;