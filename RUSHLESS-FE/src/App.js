// src/App.jsx
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Cookies from "js-cookie";
import api from "./api";
import AppLayout from "./layout/AppLayout";
import SetupPage from "./pages/SetupPage";

function App() {
  const [appMode, setAppMode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(Cookies.get("token"));
  const [userId, setUserId] = useState(Cookies.get("user_id"));

  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const API_BASE_URL = process.env.REACT_APP_API_EXAM_BASE_URL;

  // === Cek mode aplikasi
  useEffect(() => {
    const checkAppMode = async () => {
      try {
        const response = await api.get('/mode');
        if (response.data.needsSetup) {
          setAppMode('needsSetup');
        } else {
          setAppMode(response.data.mode);
        }
      } catch (error) {
        console.error("Gagal mengambil mode aplikasi:", error);
        setAppMode('error');
      } finally {
        setIsLoading(false);
      }
    };
    checkAppMode();
  }, []);

  // === SSE dengan retry otomatis
  const connectSSE = () => {
    if (!token || !userId) return;

    // tutup SSE lama jika ada
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`${API_BASE_URL}/stream/online/peserta?userId=${userId}`);

    es.onopen = () => {
      console.log("SSE online connected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    es.onmessage = (event) => {
      console.log("SSE online message:", event.data);
    };

    es.onerror = (err) => {
      console.error("SSE online error:", err);
      es.close();
      // coba reconnect setelah delay
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log("Mencoba reconnect SSE...");
        connectSSE();
      }, 3000); // retry tiap 3 detik
    };

    eventSourceRef.current = es;
  };

  // jalankan saat token/userId berubah
  useEffect(() => {
    if (!token || !userId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        console.log("SSE online closed karena logout");
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [token, userId]);

  // === update token & userId saat login/logout
  useEffect(() => {
    const handleCookieChange = () => {
      setToken(Cookies.get("token"));
      setUserId(Cookies.get("user_id"));
    };

    const interval = setInterval(handleCookieChange, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">
      Memuat Konfigurasi...
    </div>;
  }

  if (appMode === 'needsSetup') return <SetupPage />;
  if (appMode === 'error') return (
    <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700">
      Gagal memuat konfigurasi aplikasi. Pastikan backend berjalan dan muat ulang halaman.
    </div>
  );

  return (
    <Router>
      <AppLayout appMode={appMode} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;
