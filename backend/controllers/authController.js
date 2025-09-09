import authService from "../services/authService.js";
import { successResponse, errorResponse } from "../utils/responseFormatter.js";
import logger from "../utils/logger.js";

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Must be true for HTTPS
  sameSite: "none", // Required for cross-domain
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

class AuthController {
  /**
   * Set JWT token as HTTP-only cookie
   */
  setTokenCookie(res, token) {
    res.cookie("token", token, COOKIE_OPTIONS);
    return token;
  }

  /**
   * Register new user
   */
  register = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { name, email, password, role } = req.body;
      const result = await authService.registerUser({
        name,
        email,
        password,
        role,
      });

      // Set token cookie
      this.setTokenCookie(res, result.token);

      res
        .status(201)
        .json(
          successResponse(result.user, "User registered successfully", 201)
        );
    } catch (error) {
      if (error.message === "User already exists") {
        logger.error("Registration failed - user exists", {
          email: req.body.email,
        });
        return res.status(400).json(errorResponse("User already exists", 400));
      }

      logger.error("Registration failed", error);
      res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Login user
   */
  login = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { email, password } = req.body;
      const result = await authService.loginUser({ email, password });

      // Set token cookie
      this.setTokenCookie(res, result.token);

      res.json(successResponse(result.user, "Login successful"));
    } catch (error) {
      if (error.message === "Invalid credentials") {
        logger.error("Login failed - invalid credentials", {
          email: req.body.email,
        });
        return res.status(400).json(errorResponse("Invalid credentials", 400));
      }

      logger.error("Login failed", error);
      res.status(500).json(errorResponse(error.message));
    }
  };

  /**
   * Google OAuth login
   */
   googleAuth = async(req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const { token } = req.body;
      const result = await authService.googleAuth(token);

      // Set token cookie
      this.setTokenCookie(res, result.token);

      res.json(
        successResponse(result.user, "Google authentication successful")
      );
    } catch (error) {
      logger.error("Google authentication failed", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(req, res) {
    logger.route(req.method, req.originalUrl);

    try {
      const result = await authService.getCurrentUser(req.user._id);
      res.json(successResponse(result.user));
    } catch (error) {
      if (error.message === "User not found") {
        logger.error("User not found", { userId: req.user._id });
        return res.status(404).json(errorResponse("User not found", 404));
      }

      logger.error("Failed to get current user", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Switch user role
   */
   switchRole = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const result = await authService.switchUserRole(req.user._id);
      res.json(
        successResponse(null, result.message, 200, { role: result.role })
      );
    } catch (error) {
      if (error.message === "User not found") {
        logger.error("User not found for role switch", {
          userId: req.user._id,
        });
        return res.status(404).json(errorResponse("User not found", 404));
      }

      if (error.message === "Role cannot be switched") {
        logger.error("Invalid role switch attempt", { userId: req.user._id });
        return res
          .status(400)
          .json(errorResponse("Role cannot be switched", 400));
      }

      logger.error("Role switch failed", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Logout user
   */
   logout = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        ...(process.env.NODE_ENV === "production" &&
          process.env.COOKIE_DOMAIN && {
            domain: process.env.COOKIE_DOMAIN,
          }),
      });

      res.json(successResponse(null, "Logged out successfully"));
    } catch (error) {
      logger.error("Logout failed", error);
      res.status(500).json(errorResponse(error.message));
    }
  }

  /**
   * Refresh token
   */
  refreshToken = async (req, res) => {
    logger.route(req.method, req.originalUrl);

    try {
      const result = await authService.refreshToken(req.user._id);

      // Set new token cookie with extended expiry
      this.setTokenCookie(res, result.token);

      res.json(successResponse(null, result.message));
    } catch (error) {
      logger.error("Token refresh failed", error);
      res.status(500).json(errorResponse(error.message));
    }
  }
}

export default new AuthController();
