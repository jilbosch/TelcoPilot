import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Workspace from "./pages/Workspace";

function Private({ children }) {
    const { user, loading } = useAuth();
    if (loading) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                data-testid="loading-screen"
            >
                <div className="font-mono text-[12px] text-slate-400 tracking-widest">
                    CARGANDO…
                </div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function PublicOnly({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) return <Navigate to="/" replace />;
    return children;
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <PublicOnly>
                                <Login />
                            </PublicOnly>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <PublicOnly>
                                <Register />
                            </PublicOnly>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <Private>
                                <Workspace />
                            </Private>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
