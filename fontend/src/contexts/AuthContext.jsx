﻿﻿import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth as firebaseAuth } from "../utils/firebase";
import { initSocket, disconnectSocket } from "../utils/socket";

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
    const token = localStorage.getItem("token");
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        initSocket(token);
      } else {
        localStorage.removeItem("token");
        disconnectSocket(); // <-- Disconnect socket if invalid token
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      localStorage.removeItem("token");
      disconnectSocket(); // <-- Disconnect socket on error
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // ✅ First try Firebase sign-in
      try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
      } catch (firebaseError) {
        return { success: false, error: "Firebase login failed" };
      }

      // ✅ Then proceed only if Firebase login succeeds
      localStorage.setItem("token", data.token);
      setUser(data.user);
      initSocket(data.token);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  };

  const register = async (userData) => {
    try {
      // ✅ First create user in Firebase
      await createUserWithEmailAndPassword(
        firebaseAuth,
        userData.email,
        userData.password
      );

      // ✅ Optionally sign in to Firebase (not strictly necessary if already signed in)
      await signInWithEmailAndPassword(
        firebaseAuth,
        userData.email,
        userData.password
      );

      // ✅ Then register user in your backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        setUser(data.user);
        initSocket(token);
        return { success: true };
      } else {
        // Optionally clean up Firebase user if backend registration fails
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
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem("token");
        setUser(null);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    firebaseSignOut(firebaseAuth);
    disconnectSocket();
  };

  const value = {
    user,
    login,
    register,
    logout,
    refreshUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
