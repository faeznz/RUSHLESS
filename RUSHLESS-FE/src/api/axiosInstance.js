import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_EXAM_BASE_URL || 'http://localhost:4040/api',
  withCredentials: true,
});

// set Authorization header dengan token dari query string
api.interceptors.request.use((config) => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;