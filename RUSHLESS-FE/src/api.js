import axios from "axios";

// Dua pilihan baseURL
// const LOCAL_API = "http://192.168.0.12:5000/api";
// const LOCAL_API = "https://dev2.faeznz.my.id/api";
// const PROXY_API = "/api";
const API_URL= process.env.REACT_APP_API_MAIN_BASE_URL || "http://localhost:5000/api";

// Buat instance axios default dengan proxy sebagai fallback
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  (config) => {
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1];

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Gagal mengambil token dari cookies:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor untuk handle 401 dan switch URL
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const tokenExists = document.cookie.split("; ").some(item => item.trim().startsWith('token='));

    // Handle 401 logout
    if (error.response && error.response.status === 401 && tokenExists) {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        let eqPos = cookie.indexOf("=");
        let name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      }
      alert("Sesi Anda telah berakhir. Silakan login kembali.");
      window.location.href = "/";
      return Promise.reject(error);
    }

    // Jika di localhost dan request gagal karena ECONNREFUSED atau 404/500, coba fallback ke /api
    if (
      window.location.hostname === "localhost" &&
      (!error.response || error.response.status === 404 || error.response.status === 500)
    ) {
      try {
        const fallback = axios.create({
          baseURL: API_URL,
          withCredentials: true,
          headers: error.config.headers,
        });
        return fallback.request(error.config); // retry request ke /api
      } catch (fallbackError) {
        return Promise.reject(fallbackError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
