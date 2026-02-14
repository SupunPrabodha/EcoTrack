import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

export const setAuthHeader = (token) => {
  if (!token) delete api.defaults.headers.common.Authorization;
  else api.defaults.headers.common.Authorization = `Bearer ${token}`;
};
