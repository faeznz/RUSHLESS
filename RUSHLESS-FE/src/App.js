// src/App.jsx
import { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from "./api";
import AppLayout from "./layout/AppLayout";
import SetupPage from "./pages/SetupPage";
import Cookies from "js-cookie";

function App() {
  const [appMode, setAppMode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const eventSourceRef = useRef(null);

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

  // === Buka SSE online saat App mount ===
  useEffect(() => {
    // ambil token & user_id dari Cookies
    const token = Cookies.get("token");
    const user_id = Cookies.get("user_id");
    const API_BASE_URL = process.env.REACT_APP_API_EXAM_BASE_URL;

    if (token && user_id) {
      // tutup SSE lama kalau ada
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // SSE dengan header token bisa lewat query string atau cookie
      const es = new EventSource(
        `${API_BASE_URL}/stream/online/peserta?userId=${user_id}`
      );

      es.onopen = () => {
        console.log("SSE online connected");
      };

      es.onmessage = (event) => {
        // event.data bisa JSON, parse jika perlu
        console.log("SSE online message:", event.data);
      };

      es.onerror = (err) => {
        console.error("SSE online error:", err);
        es.close();
      };

      eventSourceRef.current = es;
    }

    return () => {
      // cleanup
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // dijalankan sekali saat mount

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">Memuat Konfigurasi...</div>;
  }

  if (appMode === 'needsSetup') {
    return <SetupPage />;
  }
  
  if (appMode === 'error') {
    return <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700">Gagal memuat konfigurasi aplikasi. Pastikan backend berjalan dan coba muat ulang halaman.</div>;
  }

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
