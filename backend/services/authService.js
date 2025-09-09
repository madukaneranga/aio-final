import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import logger from "../utils/logger.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  /**
   * Generate JWT token
   */
  generateToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
  }

  /**
   * Register a new user
   */
  async registerUser(userData) {
    try {
      const { name, email, password, role } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("User already exists");
      }

      // Create new user
      const user = new User({
        name,
        email,
        password,
        role: role || "customer",
      });

      await user.save();

      // Generate token
      const token = this.generateToken(user._id);

      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      };
    } catch (error) {
      logger.error("Error registering user", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async loginUser(credentials) {
    try {
      const { email, password } = credentials;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Invalid credentials");
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error("Invalid credentials");
      }

      // Generate token
      const token = this.generateToken(user._id);

      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
        }
      };
    } catch (error) {
      logger.error("Error logging in user", error);
      throw error;
    }
  }

  /**
   * Google OAuth authentication
   */
  async googleAuth(googleToken) {
    try {
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: process.env.GOOGLE_CLIENT_ID,
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
          role: "customer",
        });
        await user.save();
      }

      // Generate token
      const token = this.generateToken(user._id);

      return {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
        }
      };
    } catch (error) {
      logger.error("Error with Google OAuth", error);
      throw error;
    }
  }

  /**
   * Get current user data
   */
  async getCurrentUser(userId) {
    try {
      const user = await User.findById(userId).select("-password");
      if (!user) {
        throw new Error("User not found");
      }

      return {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
          profileImage: user.profileImage,
        }
      };
    } catch (error) {
      logger.error("Error getting current user", error);
      throw error;
    }
  }

  /**
   * Switch user role
   */
  async switchUserRole(userId) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error("User not found");
      }

      // Toggle between roles
      if (user.role === "customer") {
        user.role = "store_owner";
      } else if (user.role === "store_owner") {
        user.role = "customer";
      } else {
        throw new Error("Role cannot be switched");
      }

      await user.save();

      return {
        message: `Role switched to ${user.role}`,
        role: user.role,
      };
    } catch (error) {
      logger.error("Error switching user role", error);
      throw error;
    }
  }

  /**
   * Refresh token
   */
  async refreshToken(userId) {
    try {
      const token = this.generateToken(userId);
      return { token, message: "Token refreshed successfully" };
    } catch (error) {
      logger.error("Error refreshing token", error);
      throw error;
    }
  }
}

export default new AuthService();