﻿import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth as firebaseAuth } from "../utils/firebase";

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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/me`,
        {
          method: "GET",
          credentials: "include", // Include cookies in the request
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid or expired, user will remain null
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Cookie is automatically set by the server
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Network error" };
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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Cookie is automatically set by the server
        setUser(data.user);
        return { success: true };
      } else {
        // Clean up Firebase user if backend registration fails
        const currentUser = firebaseAuth.currentUser;
        if (currentUser) {
          await currentUser.delete();
        }
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: "Registration failed: " + error.message };
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/me`,
        {
          method: "GET",
          credentials: "include", // Include cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Token is invalid or expired
        setUser(null);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to clear the cookie
      await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include", // Include cookies
      });
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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/switch-role`,
        {
          method: "PUT",
          credentials: "include", // Include cookies
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update user with new role
        setUser((prevUser) => ({
          ...prevUser,
          role: data.role,
        }));
        return { success: true, role: data.role };
      } else {
        const data = await response.json();
        return { success: false, error: data.error };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
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
