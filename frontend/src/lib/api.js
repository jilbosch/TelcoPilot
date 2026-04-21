import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

// Attach token from localStorage if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("tp_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem("tp_token");
            localStorage.removeItem("tp_user");
            if (!window.location.pathname.startsWith("/login")) {
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);
