const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users } = require('../data/mockData');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Check if mock data mode is enabled
const useMockData = process.env.MOCK_DATA === 'true';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    if (useMockData) {
      // Find user by email in mock data
      const user = users.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Generate hardcoded tokens for demo accounts
      const DEMO_TOKENS = {
        'john.doe@accenture.com': 'demo_token_project_pic_1month_valid',
        'jane.smith@accenture.com': 'demo_token_business_ops_1month_valid', 
        'admin@accenture.com': 'demo_token_admin_1month_valid'
      };
      
      const token = DEMO_TOKENS[email] || 'demo_token_default';
      res.json({ token });
    } else {
      // Database mode - implement actual database authentication here
      return res.status(501).json({ 
        message: 'Database authentication not implemented yet' 
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

// Logout endpoint (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Demo accounts endpoint
router.get('/demo-accounts', (req, res) => {
  if (useMockData) {
    const demoAccounts = users.map(user => ({
      email: user.email,
      role: user.role,
      name: user.name,
      password: 'demo123' // Show demo password for convenience
    }));
    res.json({ demoAccounts });
  } else {
    res.status(404).json({ message: 'Demo accounts not available in database mode' });
  }
});

module.exports = router;