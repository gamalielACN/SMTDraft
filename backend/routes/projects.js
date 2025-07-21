const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { projects } = require('../data/mockData');
const { writeToMockDataFile } = require('../utils/fileWriter');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Helper function to apply filters and pagination
const applyFiltersAndPagination = (projectsList, query, userRole, userEmail) => {
  let filtered = [...projectsList];
  
  // Apply role-based filtering first
  if (userRole === 'project_pic') {
    filtered = filtered.filter(p => 
      p.deliveryLeadEmail === userEmail ||
      p.primaryContactEmail === userEmail ||
      p.secondaryContactEmail === userEmail ||
      p.primaryCPMOEmail === userEmail ||
      p.secondaryCPMOEmail === userEmail
    );
  }
  
  // Apply search
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filtered = filtered.filter(project => 
      project.projectName.toLowerCase().includes(searchTerm) ||
      project.clientName.toLowerCase().includes(searchTerm) ||
      project.projectCode.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply client name filter
  if (query.clientName) {
    const clientTerm = query.clientName.toLowerCase();
    filtered = filtered.filter(project => 
      project.clientName.toLowerCase().includes(clientTerm)
    );
  }
  
  // Apply project name filter
  if (query.projectName) {
    const projectTerm = query.projectName.toLowerCase();
    filtered = filtered.filter(project => 
      project.projectName.toLowerCase().includes(projectTerm)
    );
  }
  
  // Apply metro city filter
  if (query.metroCity) {
    const cityTerm = query.metroCity.toLowerCase();
    filtered = filtered.filter(project => 
      project.metroCity.toLowerCase().includes(cityTerm)
    );
  }
  
  // Apply date range filter
  if (query.dateFrom) {
    const fromDate = new Date(query.dateFrom);
    filtered = filtered.filter(project => new Date(project.startDate) >= fromDate);
  }
  
  if (query.dateTo) {
    const toDate = new Date(query.dateTo);
    filtered = filtered.filter(project => new Date(project.endDate) <= toDate);
  }
  
  // Calculate pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  
  // Apply pagination
  const paginatedProjects = filtered.slice(offset, offset + limit);
  
  return {
    data: paginatedProjects,
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

// Get all projects with search, filter, and pagination
router.get('/', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const result = applyFiltersAndPagination(projects, req.query, req.user.role, req.user.email);
      res.json(result);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Get project by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const project = projects.find(p => p.id === req.params.id);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check access permissions
      if (req.user.role === 'project_pic') {
        const hasAccess = project.deliveryLeadEmail === req.user.email ||
                         project.primaryContactEmail === req.user.email ||
                         project.secondaryContactEmail === req.user.email ||
                         project.primaryCPMOEmail === req.user.email ||
                         project.secondaryCPMOEmail === req.user.email;
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
      
      res.json(project);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

// Create new project (Business Ops only)
router.post('/', authenticateToken, authorizeRoles('business_ops', 'admin'), (req, res) => {
  try {
    if (useMockData) {
      const newProject = {
        id: String(projects.length + 1),
        ...req.body,
        createdBy: req.user.id,
        lastModified: new Date().toISOString()
      };
      
      projects.push(newProject);
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('projects', projects);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.status(201).json(newProject);
    } else {
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const projectIndex = projects.findIndex(p => p.id === req.params.id);
      
      if (projectIndex === -1) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const project = projects[projectIndex];
      
      // Check access permissions
      if (req.user.role === 'project_pic') {
        const hasAccess = project.deliveryLeadEmail === req.user.email ||
                         project.primaryContactEmail === req.user.email ||
                         project.secondaryContactEmail === req.user.email ||
                         project.primaryCPMOEmail === req.user.email ||
                         project.secondaryCPMOEmail === req.user.email;
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Access denied' });
        }
        
        // For project PICs, validate WBS changes
        if (req.body.wbsEntries) {
          const { invoices } = require('../data/mockData');
          
          // Check if any WBS entries being removed are used in invoices
          const currentWbsEntries = project.wbsEntries || [];
          const newWbsEntries = req.body.wbsEntries || [];
          
          const removedWbsCodes = currentWbsEntries
            .filter(current => !newWbsEntries.some(newEntry => newEntry.wbsCode === current.wbsCode))
            .map(entry => entry.wbsCode);
          
          // Check if any removed WBS codes are used in invoices
          const wbsUsedInInvoices = invoices
            .filter(invoice => invoice.projectId === req.params.id)
            .flatMap(invoice => invoice.payments.map(payment => payment.wbsCode));
          
          const conflictingWbs = removedWbsCodes.filter(wbsCode => 
            wbsUsedInInvoices.includes(wbsCode)
          );
          
          if (conflictingWbs.length > 0) {
            return res.status(400).json({ 
              message: `Cannot remove WBS entries that are used in invoices: ${conflictingWbs.join(', ')}` 
            });
          }
          
          // Validate WBS entries structure
          const hasDefault = newWbsEntries.some(entry => entry.isDefault);
          if (!hasDefault && newWbsEntries.length > 0) {
            return res.status(400).json({ 
              message: 'At least one WBS entry must be set as default' 
            });
          }
          
          // Ensure only one default
          const defaultCount = newWbsEntries.filter(entry => entry.isDefault).length;
          if (defaultCount > 1) {
            return res.status(400).json({ 
              message: 'Only one WBS entry can be set as default' 
            });
          }
          
          // Ensure default WBS is active
          const defaultWbs = newWbsEntries.find(entry => entry.isDefault);
          if (defaultWbs && !defaultWbs.isActive) {
            return res.status(400).json({ 
              message: 'Default WBS entry must be active' 
            });
          }
        }
      }
      
      projects[projectIndex] = {
        ...project,
        ...req.body,
        lastModified: new Date().toISOString()
      };
      
      // Write to file if REWRITE_MOCK is enabled
      try {
        writeToMockDataFile('projects', projects);
      } catch (writeError) {
        return res.status(500).json({ message: writeError.message });
      }
      
      res.json(projects[projectIndex]);
    } else {
      res.status(501).json({ message: 'Database operations not implemented yet' });
    }
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

module.exports = router;