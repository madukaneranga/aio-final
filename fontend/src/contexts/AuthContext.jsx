import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth as firebaseAuth } from "../utils/firebase";
import { authAPI } from "../utils/api";
import logger from "../utils/logger.js";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated by trying to fetch user data
    // No need to check localStorage anymore - cookies are handled automatically
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const result = await authAPI._getMe();
      setUser(result.data);
    } catch (error) {
      logger.error("Error fetching user", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // First try Firebase sign-in
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } catch (firebaseError) {
        return { success: false, error: "Firebase login failed" };
      }

      // Then proceed with backend login
      const result = await authAPI._login(email, password);
      setUser(result.data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || "Network error" };
    }
  };

  const register = async (userData) => {
    try {
      // First create user in Firebase
      await createUserWithEmailAndPassword(
        firebaseAuth,
        userData.email,
        userData.password
      );

      // Sign in to Firebase
      await signInWithEmailAndPassword(
        firebaseAuth,
        userData.email,
        userData.password
      );

      // Then register user in your backend
      const result = await authAPI._register(userData);
      setUser(result.data);
      return { success: true };
    } catch (error) {
      // Clean up Firebase user if backend registration fails
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        try {
          await currentUser.delete();
        } catch (deleteError) {
          console.error('Error deleting Firebase user:', deleteError);
        }
      }
      return { success: false, error: error.message || "Registration failed" };
    }
  };

  const refreshUser = async () => {
    try {
      const result = await authAPI._getMe();
      setUser(result.data);
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to clear the cookie
      await authAPI._logout();
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear local state regardless of backend response
      setUser(null);
      // Sign out from Firebase
      firebaseSignOut(firebaseAuth);
    }
  };

  // Switch role function (if needed)
  const switchRole = async () => {
    try {
      const result = await authAPI._switchRole();
      // Update user with new role
      setUser((prevUser) => ({
        ...prevUser,
        role: result.data.role,
      }));
      return { success: true, role: result.data.role };
    } catch (error) {
      return { success: false, error: error.message || "Network error" };
    }
  };

  
  const value = {
    user,
    login,
    register,
    logout,
    refreshUser,
    switchRole,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
