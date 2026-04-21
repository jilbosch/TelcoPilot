import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("tp_user") || "null");
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("tp_token");
        if (!token) {
            setLoading(false);
            return;
        }
        api.get("/auth/me")
            .then((r) => {
                setUser(r.data);
                localStorage.setItem("tp_user", JSON.stringify(r.data));
            })
            .catch(() => {
                localStorage.removeItem("tp_token");
                localStorage.removeItem("tp_user");
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const r = await api.post("/auth/login", { email, password });
        localStorage.setItem("tp_token", r.data.token);
        localStorage.setItem("tp_user", JSON.stringify(r.data.user));
        setUser(r.data.user);
        return r.data.user;
    };

    const register = async (email, password, name) => {
        const r = await api.post("/auth/register", { email, password, name });
        localStorage.setItem("tp_token", r.data.token);
        localStorage.setItem("tp_user", JSON.stringify(r.data.user));
        setUser(r.data.user);
        return r.data.user;
    };

    const logout = () => {
        localStorage.removeItem("tp_token");
        localStorage.removeItem("tp_user");
        setUser(null);
    };

    return (
        <AuthCtx.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthCtx.Provider>
    );
}

export const useAuth = () => useContext(AuthCtx);
