const jwt = require('jsonwebtoken');
const { users } = require('../data/mockData');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  // Hardcoded token validation for demo accounts
  const DEMO_TOKEN_MAP = {
    'demo_token_project_pic_1month_valid': {
      id: '1',
      email: 'john.doe@accenture.com',
      name: 'John Doe',
      role: 'project_pic',
      department: 'Technology',
      title: 'Senior Manager'
    },
    'demo_token_business_ops_1month_valid': {
      id: '2',
      email: 'jane.smith@accenture.com',
      name: 'Jane Smith',
      role: 'business_ops',
      department: 'Business Operations',
      title: 'Operations Manager'
    },
    'demo_token_admin_1month_valid': {
      id: '3',
      email: 'admin@accenture.com',
      name: 'Admin User',
      role: 'admin',
      department: 'IT',
      title: 'System Administrator'
    }
  };

  const user = DEMO_TOKEN_MAP[token];
  
  if (!user) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions for this action' 
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};