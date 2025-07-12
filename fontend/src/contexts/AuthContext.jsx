import React, { createContext, useContext, useState, useEffect } from "react";
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
            } else {
                localStorage.removeItem("token");
            }
        } catch (error) {
            console.error("Error fetching user:", error);
            localStorage.removeItem("token");
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

            if (response.ok) {
                localStorage.setItem("token", data.token);
                setUser(data.user);

                // ✅ ALSO sign in to Firebase
                await signInWithEmailAndPassword(firebaseAuth, email, password);

                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: "Network error" };
        }
    };

    const register = async (userData) => {
        try {
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

                // ✅ Register user in Firebase Auth
                await createUserWithEmailAndPassword(
                    firebaseAuth,
                    userData.email,
                    userData.password
                );
                // ✅ Sign them in to Firebase Auth
                await signInWithEmailAndPassword(
                    firebaseAuth,
                    userData.email,
                    userData.password
                );

                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            return { success: false, error: "Network error" };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        firebaseSignOut(firebaseAuth);
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
