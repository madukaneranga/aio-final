import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,        // Prevents XSS attacks
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict',    // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/'
};

// Helper function to generate and set JWT cookie
const setTokenCookie = (res, userId) => {
  const token = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.cookie('token', token, COOKIE_OPTIONS);
  return token;
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'customer'
    });

    await user.save();

    // Set token cookie
    setTokenCookie(res, user._id);

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Set token cookie
    setTokenCookie(res, user._id);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (!user) {
      // Create new user
      user = new User({
        name,
        email,
        googleId,
        profileImage: picture,
        role: 'customer'
      });
      await user.save();
    }

    // Set token cookie
    setTokenCookie(res, user._id);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        storeId: req.user.storeId,
        profileImage: req.user.profileImage
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Switch user role between customer and store_owner
router.put('/switch-role', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Toggle between roles
    if (user.role === 'customer') {
      user.role = 'store_owner';
    } else if (user.role === 'store_owner') {
      user.role = 'customer';
    } else {
      return res.status(400).json({ error: 'Role cannot be switched' });
    }

    await user.save();

    res.json({
      message: `Role switched to ${user.role}`,
      role: user.role
    });
  } catch (error) {
    console.error('Role switch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  res.json({ message: 'Logged out successfully' });
});

// Refresh token (optional - extends session)
router.post('/refresh', authenticate, (req, res) => {
  try {
    // Set new token cookie with extended expiry
    setTokenCookie(res, req.user._id);
    
    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;