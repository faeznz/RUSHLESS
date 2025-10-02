import api from "../api";
import { toast } from "../utils/toast";
import { useEffect, useState, useRef } from "react";

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const WebSettingsPage = () => {
  const [judul, setJudul] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoFromServer, setLogoFromServer] = useState("");
  const [tables, setTables] = useState([]);
  const [corsOrigins, setCorsOrigins] = useState([]);
  const [newOrigin, setNewOrigin] = useState("");

  const [showCorsModal, setShowCorsModal] = useState(false);

  // State untuk fitur update
  const [updateStatus, setUpdateStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateLogs, setUpdateLogs] = useState([]);
  const sseRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    fetchWebSettings();
    fetchTables();
    fetchCorsConfig();

    // Cleanup SSE connection on component unmount
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [updateLogs]);

  const fetchCorsConfig = () => api.get("/cors-config").then((res) => setCorsOrigins(res.data.corsOrigins || []));
  const fetchWebSettings = () => api.get("/web-settings").then((res) => { setJudul(res.data.judul || ""); setLogoFromServer(res.data.logo); });
  const fetchTables = () => api.get("/db/tables").then((res) => setTables(res.data.tables));

  const handleSaveSettings = async () => {
    const formData = new FormData();
    formData.append("judul", judul);
    if (logoFile) formData.append("logo", logoFile);
    try {
      await api.put("/web-settings", formData);
      toast.success("Pengaturan website berhasil disimpan.");
      setLogoFile(null);
      fetchWebSettings();
    } catch (err) { toast.error("Gagal menyimpan pengaturan website"); }
  };

  const saveOrigins = async (originsToSave) => {
    try {
      await api.post("/cors-config", { corsOrigins: originsToSave });
      toast.success("Pengaturan CORS disimpan. Server sedang direstart, mohon tunggu...");
      setTimeout(() => { toast.info("Mengambil konfigurasi CORS terbaru..."); fetchCorsConfig(); }, 3000);
    } catch (err) { toast.error("Gagal menyimpan pengaturan CORS"); }
  };

  const handleAddOrigin = () => {
    if (newOrigin && !corsOrigins.includes(newOrigin)) {
      const newOriginsList = [...corsOrigins, newOrigin.trim()];
      setCorsOrigins(newOriginsList);
      setNewOrigin("");
      saveOrigins(newOriginsList);
      setShowCorsModal(false); // Close modal on success
    }
  };

  const handleDeleteOrigin = (originToDelete) => {
    const newOriginsList = corsOrigins.filter(origin => origin !== originToDelete);
    setCorsOrigins(newOriginsList);
    saveOrigins(newOriginsList);
  };

  const handleDeleteTable = (table) => { if (!window.confirm(`Anda yakin ingin menghapus tabel ${table}?`)) return; api.delete(`/db/${table}`).then(() => { toast.success(`Tabel ${table} berhasil dihapus`); fetchTables(); }); };
  const handleResetDB = () => { if (!window.confirm("PERHATIAN: Anda yakin ingin mereset seluruh database?")) return; api.post("/db/reset").then(() => { toast.success("Database berhasil direset!"); fetchTables(); }); };
  const handleRestart = () => { if (!window.confirm("Anda yakin ingin merestart server?")) return; api.post("/restart-server").then(() => toast.success("Server sedang direstart...")); };

  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setUpdateStatus(null);
    try {
      const res = await api.get("/update/check");
      setUpdateStatus(res.data);
      if (res.data.updateAvailable) toast.success("Pembaruan tersedia!");
      else toast.info("Aplikasi Anda sudah menggunakan versi terbaru.");
    } catch (err) { toast.error(err.response?.data?.message || "Gagal memeriksa pembaruan."); }
    finally { setIsChecking(false); }
  };

  const handleInstallUpdate = async () => {
    if (!window.confirm("Anda yakin ingin menginstal pembaruan? Proses ini akan menimpa file aplikasi dan me-restart server.")) return;
    
    setUpdateLogs([]);
    setShowUpdateModal(true);
    setIsUpdating(true);

    const token = document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    const sseUrl = `${api.defaults.baseURL}/update/stream${token ? `?token=${token}` : ''}`;
    const sse = new EventSource(sseUrl);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.log === "__END__") {
        setUpdateLogs(prev => [...prev, "[INFO] Selesai. Silakan tutup modal ini."]);
        setIsUpdating(false);
        sse.close();
        sseRef.current = null;
      } else {
        setUpdateLogs(prev => [...prev, data.log]);
      }
    };

    sse.onerror = (err) => {
      console.error("SSE Error:", err);
      setUpdateLogs(prev => [...prev, "[ERROR] Koneksi ke server log terputus. Proses mungkin masih berjalan di background."]);
      setIsUpdating(false);
      sse.close();
      sseRef.current = null;
    };

    try {
      await api.post("/update/install");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memulai proses pembaruan.");
      setIsUpdating(false);
      setShowUpdateModal(false);
      if (sseRef.current) sseRef.current.close();
    }
  };

  const toAbsoluteImageSrc = (path) => { if (!path) return ""; const baseURL = api.defaults.baseURL; if (path.startsWith("http")) return path; return `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`; };
  const logoPreviewSrc = logoFile ? URL.createObjectURL(logoFile) : toAbsoluteImageSrc(logoFromServer);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 font-sans">
      <div className="space-y-10">
        
        {/* PENGATURAN WEBSITE */}
        <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Website</h2>
          <div className="space-y-6">
            <div>
              <label htmlFor="judul" className="block text-sm font-medium text-gray-700 mb-1">Judul Website</label>
              <input id="judul" type="text" className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition" value={judul} onChange={(e) => setJudul(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo Website</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  {logoPreviewSrc ? (
                    <img src={logoPreviewSrc} alt="Logo Preview" className="h-24 mx-auto mb-4 object-contain" />
                  ) : (
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Unggah file baru</span>
                      <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
                    </label>
                    <p className="pl-1">atau seret dan lepas</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF hingga 10MB</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-right">
            <button onClick={handleSaveSettings} className="bg-blue-600 text-white px-5 py-2.5 rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition">Simpan Perubahan</button>
          </div>
        </div>

        {/* PENGATURAN CORS */}
        <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan CORS</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Daftar Origin yang Diizinkan</label>
              <div className="space-y-2">
                {corsOrigins.map((origin, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                    <span className="text-sm text-gray-800">{origin}</span>
                    <button onClick={() => handleDeleteOrigin(origin)} className="text-red-500 hover:text-red-700"><TrashIcon /></button>
                  </div>
                ))}
              </div>
            </div>
            <div>
                <button onClick={() => setShowCorsModal(true)} className="bg-blue-500 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-600">Tambah Origin Baru</button>
            </div>
          </div>
          <div className="mt-8 text-right">
            <button onClick={() => saveOrigins(corsOrigins)} className="bg-green-600 text-white px-5 py-2.5 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition">Simpan & Restart Server</button>
          </div>
        </div>

        {/* PENGATURAN APLIKASI & PEMBARUAN */}
        <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Aplikasi</h2>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pembaruan Aplikasi</h3>
            <div className="flex items-center gap-4">
              <button onClick={handleCheckUpdate} disabled={isChecking || isUpdating} className="bg-indigo-600 text-white px-5 py-2.5 rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-gray-400 transition">{isChecking ? "Memeriksa..." : "Cek Pembaruan"}</button>
              {updateStatus?.updateAvailable && !isUpdating && (
                <button onClick={handleInstallUpdate} disabled={isUpdating} className="bg-teal-600 text-white px-5 py-2.5 rounded-md shadow-sm hover:bg-teal-700 disabled:bg-gray-400 transition">Instal Pembaruan</button>
              )}
            </div>
            {updateStatus && (
              <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                <p>Versi Lokal: <span className="font-mono">{updateStatus.localCommit.substring(0, 12)}</span></p>
                <p>Versi Terbaru: <span className="font-mono">{updateStatus.remoteCommit.substring(0, 12)}</span></p>
              </div>
            )}
          </div>
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Tindakan Server</h3>
            <button onClick={handleRestart} className="bg-gray-700 text-white px-4 py-2 rounded-md shadow-sm hover:bg-gray-800">Restart Server</button>
          </div>
        </div>

        {/* MANAJEMEN DATABASE */}
        <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Manajemen Database</h3>
          <div className="space-y-3 mb-6">
            {tables.length > 0 ? (
              tables.map((table, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200">
                  <span className="font-mono text-sm text-gray-700">{table}</span>
                  <button onClick={() => handleDeleteTable(table)} className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors"><TrashIcon /> <span className="text-sm font-medium">Hapus</span></button>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Tidak ada tabel ditemukan.</p>
            )}
          </div>
          <div className="mt-6 border-t pt-6">
            <h4 className="text-lg font-semibold text-red-700">Zona Berbahaya</h4>
            <p className="text-sm text-gray-600 mt-1 mb-4">Tindakan berikut tidak dapat diurungkan. Harap berhati-hati.</p>
            <button onClick={handleResetDB} className="bg-red-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-red-700">Reset Database</button>
          </div>
        </div>

      </div>

      {/* CORS Origin Modal */}
      {showCorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 m-4">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Tambah Origin Baru</h2>
            <div className="flex gap-2">
              <input
                id="newOrigin"
                type="text"
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                placeholder="http://localhost:3001"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowCorsModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleAddOrigin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Log Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
          <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl h-4/5 flex flex-col p-6 m-4">
            <div className="flex justify-between items-center mb-4 border-b border-gray-600 pb-3">
              <h2 className="text-xl font-bold">Log Instalasi Pembaruan</h2>
              {!isUpdating && (
                <button onClick={() => { setShowUpdateModal(false); window.location.reload(); }} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-semibold">Tutup & Refresh Halaman</button>
              )}
            </div>
            <div className="flex-grow bg-black p-4 rounded-md overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {updateLogs.map((log, index) => (
                <p key={index} className={`${log.startsWith("[ERROR]") || log.startsWith("[FAILED]") ? 'text-red-400' : log.startsWith("[SUCCESS]") ? 'text-green-400' : 'text-gray-300'}`}>
                  <span className="text-gray-500 mr-2">{`[${new Date().toLocaleTimeString()}]`}</span>{log}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
            {isUpdating && (
              <div className="flex items-center gap-3 mt-4 text-yellow-400">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <span>Proses sedang berjalan, jangan tutup jendela ini...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebSettingsPage;