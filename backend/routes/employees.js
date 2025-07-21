const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { projects, tickets } = require('../data/mockData');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Helper function to extract EID from email
const extractEID = (email) => {
  return email.split('@')[0];
};

// Helper function to determine employee role in project with priority
const getEmployeeRole = (email, project) => {
  // Priority order: Delivery Lead > Primary Contact > Secondary Contact > Primary CPMO > Secondary CPMO > Team Member
  if (email === project.deliveryLeadEmail) return 'Delivery Lead';
  if (email === project.primaryContactEmail) return 'Primary Contact';
  if (email === project.secondaryContactEmail) return 'Secondary Contact';
  if (email === project.primaryCPMOEmail) return 'Primary CPMO';
  if (email === project.secondaryCPMOEmail) return 'Secondary CPMO';
  return 'Team Member';
};

// Helper function to get user's accessible projects
const getUserProjects = (user, allProjects) => {
  if (user.role === 'business_ops' || user.role === 'admin') {
    return allProjects;
  }
  
  // Project PICs see only their projects
  return allProjects.filter(p => 
    p.deliveryLeadEmail === user.email ||
    p.primaryContactEmail === user.email ||
    p.secondaryContactEmail === user.email ||
    p.primaryCPMOEmail === user.email ||
    p.secondaryCPMOEmail === user.email
  );
};

// Helper function to apply filters and pagination
const applyFiltersAndPagination = (employees, query) => {
  let filtered = [...employees];
  
  // Apply search
  if (query.search) {
    const searchTerm = query.search.toLowerCase();
    filtered = filtered.filter(emp => 
      emp.email.toLowerCase().includes(searchTerm) ||
      emp.projectName.toLowerCase().includes(searchTerm) ||
      emp.role.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply client filter
  if (query.client) {
    const clientTerm = query.client.toLowerCase();
    const clientProjects = projects.filter(p => 
      p.clientName.toLowerCase().includes(clientTerm)
    ).map(p => p.id);
    filtered = filtered.filter(emp => clientProjects.includes(emp.projectId));
  }
  
  // Apply project filter
  if (query.project) {
    filtered = filtered.filter(emp => emp.projectId === query.project);
  }
  
  // Calculate pagination
  const page = parseInt(query.page) || 1;
  const limit = Math.min(parseInt(query.limit) || 20, 100); // Max 100 per page
  const offset = (page - 1) * limit;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  
  // Apply pagination
  const paginatedEmployees = filtered.slice(offset, offset + limit);
  
  return {
    data: paginatedEmployees,
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

// Get all employees with search, filter, and pagination
router.get('/', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      // Get user's accessible tickets based on role
      let userTickets;
      if (req.user.role === 'business_ops' || req.user.role === 'admin') {
        // Get all approved seat allocation tickets
        userTickets = tickets.filter(t => 
          t.type === 'seat_allocation' && t.currentStatus === 'approved'
        );
      } else if (req.user.role === 'project_pic') {
        // Get user's accessible projects first
        const userProjects = projects.filter(p => 
          p.deliveryLeadEmail === req.user.email ||
          p.primaryContactEmail === req.user.email ||
          p.secondaryContactEmail === req.user.email ||
          p.primaryCPMOEmail === req.user.email ||
          p.secondaryCPMOEmail === req.user.email
        );
        const userProjectIds = userProjects.map(p => p.id);
        
        // Get approved seat allocation tickets for user's projects
        userTickets = tickets.filter(t => 
          t.type === 'seat_allocation' && 
          t.currentStatus === 'approved' &&
          userProjectIds.includes(t.projectId)
        );
      } else {
        userTickets = [];
      }
      
      // Build employee list from approved seat allocation tickets
      const employees = [];
      
      userTickets.forEach(ticket => {
        const project = projects.find(p => p.id === ticket.projectId);
        if (!project) return;
        
        // Process employee emails from ticket
        const employeeEmails = ticket.formData?.employeeEmails || [];
        
        employeeEmails.forEach(email => {
          if (!email || !email.includes('@')) return;
          
          const eid = extractEID(email);
          const role = getEmployeeRole(email, project);
          const status = project.status === 'active' ? 'Active' : 'Inactive';
          
          // Check if employee already exists
          const existingEmployee = employees.find(emp => emp.email === email);
          
          if (existingEmployee) {
            // Update with latest project info (higher ticket ID = more recent)
            if (parseInt(ticket.id) > parseInt(existingEmployee.ticketId)) {
              existingEmployee.projectName = project.projectName;
              existingEmployee.projectId = project.id;
              existingEmployee.role = role;
              existingEmployee.status = status;
              existingEmployee.ticketId = ticket.id;
            }
          } else {
            // Create new employee entry
            employees.push({
              id: `${email}_${project.id}_${ticket.id}`,
              eid: eid,
              email: email,
              projectName: project.projectName,
              projectId: project.id,
              role: role,
              status: status,
              ticketId: ticket.id
            });
          }
        });
      });
      
      // Apply filters and pagination
      const result = applyFiltersAndPagination(employees, req.query);
      
      res.json(result);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
});

// Get employee by ID
router.get('/:id', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const employeeId = req.params.id;
      const email = employeeId.includes('_') ? employeeId.split('_')[0] : employeeId;
      
      const employee = {
        id: employeeId,
        eid: extractEID(email),
        email: email
      };
      
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      
      res.json(employee);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
});

// Get employees for specific project
router.get('/project/:projectId', authenticateToken, (req, res) => {
  try {
    if (useMockData) {
      const projectId = req.params.projectId;
      const project = projects.find(p => p.id === projectId);
      
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
      
      // Get approved seat allocation tickets for this project
      const approvedSeatTickets = tickets.filter(t => 
        t.type === 'seat_allocation' && 
        t.currentStatus === 'approved' && 
        t.projectId === projectId
      );
      
      // Get latest ticket for this project (by ticket ID)
      const latestTicket = approvedSeatTickets.reduce((latest, current) => {
        return !latest || parseInt(current.id) > parseInt(latest.id) ? current : latest;
      }, null);
      
      // Build employee list
      const employees = [];
      
      // Only process latest ticket
      if (latestTicket) {
        const employeeEmails = ticket.formData?.employeeEmails || [];
        
        employeeEmails.forEach(email => {
          if (!email || !email.includes('@')) return;
          
          const eid = extractEID(email);
          const role = getEmployeeRole(email, project);
          const status = project.status === 'active' ? 'Active' : 'Inactive';
          
          // Check if employee already exists
          const existingEmployee = employees.find(emp => emp.email === email);
          
          if (!existingEmployee) {
            employees.push({
              id: `${email}_${projectId}_${ticket.id}`,
              eid: eid,
              email: email,
              role: role,
              status: status
            });
          }
        });
      }
      
      res.json(employees);
    } else {
      res.status(501).json({ message: 'Database queries not implemented yet' });
    }
  } catch (error) {
    console.error('Get project employees error:', error);
    res.status(500).json({ message: 'Failed to fetch project employees' });
  }
});

module.exports = router;