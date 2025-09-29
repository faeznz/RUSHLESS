import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiChevronDown, FiUser } from "react-icons/fi";
import { FiArrowLeft, FiArrowRight, FiRefreshCw } from "react-icons/fi";
import Cookies from "js-cookie";
import api from "../api";

function Header({ onToggleSidebar }) {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [userName, setUserName] = useState("User");
  const [siteTitle, setSiteTitle] = useState("ExamApp");
  const [siteLogo, setSiteLogo] = useState("");

  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const logoutFlagRef = useRef(false);

  const eventSourceRef = useRef(null);
const reconnectTimeoutRef = useRef(null);


  useEffect(() => {
    const nameFromCookie = Cookies.get("name");
    if (nameFromCookie) setUserName(nameFromCookie);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performCleanup = () => {
    Cookies.remove("token");
    Cookies.remove("name");
    Cookies.remove("role");
    Cookies.remove("user_id");
    navigate("/", { replace: true });
  };

const handleLogout = async () => {
  if (logoutFlagRef.current) return;
  logoutFlagRef.current = true;

  try {
    const user_id = Cookies.get("user_id");
    // Panggil endpoint logout utama di backend
    await api.post("/auth/logout", { user_id });
  } catch (err) {
    console.error("Gagal saat memanggil endpoint logout:", err);
    // Tetap lanjutkan cleanup di frontend meskipun backend gagal
  } finally {
    // 🔹 Tutup semua koneksi SSE
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      console.log("SSE online diputus saat logout");
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // 🔹 Cleanup cookie / state login
    performCleanup(); // fungsi lama yang hapus cookie & redirect
  }
};

  useEffect(() => {
    const user_id = Cookies.get("user_id");
    if (!user_id) return;

    let idleTimeout = null;
    let sse = null;
    let intervalOnline = null;
    let isActive = true;

    const cleanupResources = () => {
      if (!isActive) return;
      isActive = false;

      clearTimeout(idleTimeout);
      clearInterval(intervalOnline);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      activityEvents.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
      if (sse) {
        sse.close();
        sse = null;
      }
    };

    const resetIdleTimer = () => {
      if (!isActive || logoutFlagRef.current) return;
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => updateStatus("offline"), 10 * 60 * 1000);
    };

    const updateStatus = async (status) => {
      if (!isActive || logoutFlagRef.current) return;
      try {
        await api.post("/session", { user_id, status });
      } catch (err) {
        console.error("❌ Gagal update status:", err);
      }
    };

    const handleBeforeUnload = () => {
      if (!isActive || logoutFlagRef.current) return;
      updateStatus("offline");
    };

    const activityEvents = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    activityEvents.forEach(ev => window.addEventListener(ev, resetIdleTimer));
    resetIdleTimer();

    const setupSSE = () => {
      if (!isActive || logoutFlagRef.current) return;

      sse = new EventSource(`${api.defaults.baseURL}/exam/session/stream`);

      // Listener for the named 'unlock' event (for forced logout)
      sse.addEventListener('unlock', (event) => {
        if (!isActive || logoutFlagRef.current) return;
        try {
          const data = JSON.parse(event.data);
          const currentUserId = Cookies.get("user_id");
          if (data.user_id && data.user_id.toString() === currentUserId) {
            cleanupResources();
            handleLogout();
          }
        } catch (err) {
          console.error("❌ Gagal parsing data SSE (unlock):", err);
        }
      });

      // Listener for generic messages (like timer updates)
      sse.onmessage = (event) => {
        if (!isActive || logoutFlagRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "timer-updated") {
            window.location.reload();
          }
        } catch (err) {
          // This might catch the 'unlock' event data if not parsed as JSON, so we can ignore it.
          // console.error("❌ Gagal parsing data SSE (generic):", err);
        }
      };        

      sse.onerror = (err) => {
        console.warn("SSE error:", err);
        if (sse) sse.close();

        if (isActive && !logoutFlagRef.current) {
          setTimeout(setupSSE, 3000);
        }
      };
    };

    intervalOnline = setInterval(() => {
      updateStatus("online");
    }, 10 * 60 * 1000);

    setupSSE();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return cleanupResources;
  }, [navigate]);

  useEffect(() => {
    api.get("/web-settings")
      .then((res) => {
        setSiteTitle(res.data.judul || "ExamApp");
        setSiteLogo(toAbsoluteImageSrc(res.data.logo));
      })
      .catch((err) => {
        console.warn("❌ Gagal ambil pengaturan web:", err);
      });
  }, []);

  const toAbsoluteImageSrc = (path) => {
    if (!path) return "";
  
    const baseURL = api.defaults.baseURL;
  
    if (path.startsWith("http")) {
      return path;
    }
  
    const fullURL = `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;
    return fullURL;
  };

  return (
    <header className="bg-slate-800 px-4 sm:px-6 py-2 flex justify-between items-center shadow-md border-b border-slate-700">
      <div className="flex items-center gap-3">
    <button
      onClick={onToggleSidebar}
      className="bg-slate-700 text-slate-200 rounded-sm p-2 text-2xl hover:bg-slate-600 transition-colors"
    >
      ☰
    </button>
    <div className="flex items-center gap-2">
      {siteLogo && (
        <img
          src={siteLogo}
          alt="Logo"
          className="h-8 w-8 object-contain rounded-sm bg-white"
        />
      )}
      <h1 className="text-xl font-semibold text-white">{siteTitle}</h1>
    </div>
  </div>

  {/* Tengah: Navigasi */}
  <div className="flex justify-start sm:justify-center gap-2">
    <button
      onClick={() => window.history.back()}
      className="bg-slate-700 text-white p-2 rounded hover:bg-slate-600"
      title="Kembali"
    >
      <FiArrowLeft />
    </button>
    <button
      onClick={() => window.history.forward()}
      className="bg-slate-700 text-white p-2 rounded hover:bg-slate-600"
      title="Maju"
    >
      <FiArrowRight />
    </button>
    <button
      onClick={() => window.location.reload()}
      className="bg-slate-700 text-white p-2 rounded hover:bg-slate-600"
      title="Muat Ulang"
    >
      <FiRefreshCw />
    </button>
  </div>
      <div ref={dropdownRef} className="relative">
        <div
          className="flex items-center cursor-pointer p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
          onClick={() => setDropdownOpen(!isDropdownOpen)}
        >
          <span className="mr-3 text-slate-200 hidden sm:block">
            Selamat datang, <strong>{userName}</strong>
          </span>
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <FiChevronDown
            className={`ml-2 h-5 w-5 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </div>

        <div
          className={`absolute right-0 mt-3 w-48 bg-white rounded-md shadow-lg py-1 z-20 transition-all duration-150 ease-in-out ${
            isDropdownOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="px-4 py-2 text-sm text-gray-700 border-b">
            <p className="font-semibold">Masuk sebagai</p>
            <p className="truncate">{userName}</p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 group"
          >
            <FiUser className="mr-3 text-gray-500 group-hover:text-blue-500" />
            <span className="group-hover:text-gray-900">Profil</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 group"
          >
            <FiLogOut className="mr-3 text-gray-500 group-hover:text-red-500" />
            <span className="group-hover:text-gray-900">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
