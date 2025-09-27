import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Cookies from "js-cookie";
import { FiUser, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

function LoginPage() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [siteTitle, setSiteTitle] = useState("Selamat Datang");
  const [siteLogo, setSiteLogo] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    api.get("/web-settings")
      .then(res => {
        setSiteTitle(res.data.judul || "Selamat Datang");
        setSiteLogo(toAbsoluteImageSrc(res.data.logo));
      })
      .catch(err => {
        console.warn("❌ Gagal ambil pengaturan situs:", err);
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      setMessage("❌ Username dan password tidak boleh kosong.");
      return;
    }
    setMessage("");
    setIsLoading(true);

    try {
      const res = await api.post("/auth/login", form);
      const { user_id, token, name, role } = res.data;

      Cookies.set("user_id", user_id, { expires: 2 });
      Cookies.set("token", token, { expires: 2 });
      Cookies.set("name", name, { expires: 2 });
      Cookies.set("role", role, { expires: 2 });

      await api.post("/session", { user_id, status: "online" });

      setMessage("✅ Login berhasil! Mengarahkan...");
      setTimeout(() => {
        let redirectPath = localStorage.getItem("redirectAfterLogin");

        // Jika role bukan admin, jangan arahkan ke halaman admin yang mungkin tersimpan.
        if (role !== 'admin' && redirectPath) {
          redirectPath = null; // Abaikan path yang tersimpan
        }
        
        // Hapus item dari localStorage setelah dibaca
        localStorage.removeItem("redirectAfterLogin");

        // Arahkan ke path yang sesuai, atau default ke /home
        navigate(redirectPath || "/home", { replace: true });
      }, 1500);      
    } catch (err) {
      setMessage(`❌ ${err.response?.data?.message || "Username atau password salah"}`);
    } finally {
      setTimeout(() => setIsLoading(false), 1000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-4">
          {siteLogo ? (
            <img
              src={siteLogo}
              alt="Logo Situs"
              className="h-16 w-16 object-contain rounded-full"
            />
          ) : (
            <div className="bg-indigo-600 p-3 rounded-full">
              <FiUser className="w-8 h-8 text-white" />
            </div>
          )}
        </div>

        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">{siteTitle}</h1>
            <p className="text-slate-500 mt-1">Silakan masuk ke akun Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="Masukkan username"
                  onChange={handleChange}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan password"
                  onChange={handleChange}
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {message && (
              <p
                className={`text-center text-sm font-medium ${
                  message.includes("✅") ? "text-green-600" : "text-red-600"
                }`}
              >
                {message}
              </p>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Memproses...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </div>
          </form>
          <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => alert("Silahkan hubungi Admin ujian untuk mereset password")}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                Lupa password?
              </button>
            </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;