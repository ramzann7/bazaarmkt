// src/services/authService.js
import axios from "axios";

const API_URL = "/api/auth"; // Using Vite proxy

// Custom event for auth state changes
const AUTH_EVENT = 'authStateChanged';

export const authToken = {
  getToken: () => localStorage.getItem("token"),
  setToken: (token) => {
    localStorage.setItem("token", token);
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { isAuthenticated: true } }));
  },
  removeToken: () => {
    localStorage.removeItem("token");
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { isAuthenticated: false } }));
  },
};

export const registerUser = async (userData) => {
  const res = await axios.post(`${API_URL}/register`, userData);
  authToken.setToken(res.data.token);
  return res.data;
};

export const loginUser = async (userData) => {
  const res = await axios.post(`${API_URL}/login`, userData);
  authToken.setToken(res.data.token);
  return res.data;
};

export const logoutUser = () => {
  authToken.removeToken();
};

// New: getProfile
export const getProfile = async () => {
  const token = authToken.getToken();
  const res = await axios.get(`/api/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};
