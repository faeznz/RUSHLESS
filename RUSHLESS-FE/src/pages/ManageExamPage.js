import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import { toast } from "../utils/toast";

// --- Helper Components (Bisa dipisah ke file sendiri) ---

// Komponen untuk menampilkan status dengan warna
const StatusBadge = ({ status }) => {
  const statusMap = {
    online: { text: "Online", color: "bg-green-100 text-green-800" },
    offline: { text: "Offline", color: "bg-gray-200 text-gray-800" },
    mengerjakan: { text: "Mengerjakan", color: "bg-blue-100 text-blue-800" },
    selesai: { text: "Selesai", color: "bg-purple-100 text-purple-800" },
  };
  const currentStatus = statusMap[status?.toLowerCase()] || { text: status || "-", color: "bg-gray-100 text-gray-600" };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${currentStatus.color}`}>{currentStatus.text}</span>;
};

// Komponen Tombol Aksi dengan Ikon dan Tooltip
const ActionButton = ({ onClick, icon, text, color, tooltip }) => (
  <button
    onClick={onClick}
    title={tooltip}
    className={`flex items-center gap-1 px-2 py-1 text-white rounded text-xs transition-transform transform hover:scale-105 ${color}`}
  >
    {icon} <span className="hidden sm:inline">{text}</span>
  </button>
);

// Komponen Modal Konfirmasi Universal
const ConfirmationModal = ({ show, onHide, onConfirm, title, message }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onHide} className="px-4 py-2 bg-gray-200 rounded-md font-semibold hover:bg-gray-300">Batal</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-md font-semibold hover:bg-red-600">Konfirmasi</button>
        </div>
      </div>
    </div>
  );
};

// Komponen Loading Spinner
const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
);


// --- Main Component ---
export default function ManageExamPage() {
  const [siswa, setSiswa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kelasFilter, setKelasFilter] = useState("");
  const [searchNama, setSearchNama] = useState("");
  const [courseId] = useState(1); // Tetap, bisa diubah jika perlu

  // State untuk modal tambah waktu
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [menit, setMenit] = useState(0);
  const [detik, setDetik] = useState(0);

  // State untuk modal konfirmasi
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState({ action: null, user: null, message: "" });

  // --- Data Fetching ---
  const fetchSiswa = async () => {
    // Tidak set loading ke true jika bukan fetch pertama kali, agar tidak ada flicker
    // setLoading(true); // Optional: Hapus ini jika tidak ingin spinner muncul setiap 5 detik
    try {
      const res = await api.get("/exam/siswa");
      setSiswa(res.data);
    } catch {
      toast.error("❌ Gagal mengambil data siswa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiswa();
    const interval = setInterval(fetchSiswa, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Fungsi Aksi dengan Konfirmasi ---
  const openConfirmation = (action, user, message) => {
    setConfirmPayload({ action, user, message });
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    const { action, user } = confirmPayload;
    if (!action || !user) return;

    try {
      switch (action) {
        case 'RESET':
          await api.delete(`/exam/reset/${courseId}`, { data: { user_id: user.id } });
          toast.success(`✅ Ujian ${user.name} berhasil direset`);
          break;
        case 'LOGOUT':
          await api.post("/exam/logout-user", { user_id: user.id });
          toast.success(`✅ ${user.name} berhasil logout`);
          break;
        case 'TOGGLE_LOCK':
          if (user.login_locked) {
            await api.post("/exam/unlock-user", { user_id: user.id });
            toast.success(`🔓 Akun ${user.name} berhasil dibuka`);
          } else {
            await api.post("/exam/lock-user", { user_id: user.id });
            toast.success(`🔒 Akun ${user.name} berhasil dikunci`);
          }
          break;
        default:
          break;
      }
      fetchSiswa(); // Refresh data setelah aksi berhasil
    } catch (error) {
      toast.error(`❌ Gagal melakukan aksi: ${error.message}`);
    } finally {
      setShowConfirmModal(false);
    }
  };


  // --- Fungsi Tambah Waktu ---
  const bukaModalTambahWaktu = (user) => {
    setSelectedUser(user);
    setMenit(0);
    setDetik(0);
    setShowTimeModal(true);
  };

  const konfirmasiTambahWaktu = async () => {
    const totalDetik = parseInt(menit, 10) * 60 + parseInt(detik, 10);
    if (isNaN(totalDetik) || totalDetik <= 0) {
      toast.warn("⏱️ Masukkan waktu yang valid.");
      return;
    }
    try {
      await api.post("/exam/add-timer", {
        user_id: selectedUser.id,
        course_id: courseId,
        detik: totalDetik,
      });
      toast.success(`✅ Waktu ditambahkan untuk ${selectedUser.name}`);
      setShowTimeModal(false);
    } catch {
      toast.error("❌ Gagal menambahkan waktu");
    }
  };
  
  const kelasList = useMemo(() => {
    const allClasses = siswa.map(s => s.kelas).filter(Boolean);
    return [...new Set(allClasses)].sort();
  }, [siswa]);

  // --- Filtering dan Grouping dengan useMemo untuk optimasi ---
  const groupedAndFilteredSiswa = useMemo(() => {
    const filtered = siswa.filter((s) => {
      // Jika kelasFilter ada, lakukan perbandingan case-insensitive
      const cocokKelas = kelasFilter ? s.kelas?.toLowerCase() === kelasFilter.toLowerCase() : true;
      const cocokNama = searchNama ? s.name?.toLowerCase().includes(searchNama.toLowerCase()) : true;
      return cocokKelas && cocokNama;
    });

    const groups = {};
    filtered.forEach((s) => {
      const key = s.kelas || "Tanpa Kelas";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(s);
    });

    return groups;
  }, [siswa, kelasFilter, searchNama]);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kontrol ujian</h1>
        {/* Bisa ditambahkan tombol aksi global di sini jika perlu */}
      </div>

      {/* Kontrol Filter */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-600 mb-1 block">Filter Kelas</label>
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map(kelas => (
              <option key={kelas} value={kelas}>{kelas}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-600 mb-1 block">Cari Nama Siswa</label>
          <input
            value={searchNama}
            onChange={(e) => setSearchNama(e.target.value)}
            className="w-full border px-3 py-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ketik nama siswa..."
          />
        </div>
      </div>

      {/* Tabel Data */}
      {loading ? (
        <LoadingSpinner />
      ) : Object.keys(groupedAndFilteredSiswa).length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow">
          <p className="font-semibold text-lg">🚫 Tidak ada data</p>
          <p>Tidak ada siswa yang cocok dengan filter Anda.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedAndFilteredSiswa).sort().map((kelasNama) => (
            <section key={kelasNama}>
              <h2 className="text-xl font-semibold text-gray-700 mb-4 ml-2">
                Kelas: {kelasNama}
              </h2>
              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full w-full text-sm text-left text-gray-700">
                  <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                    <tr>
                      <th className="p-4">Nama</th>
                      <th className="p-4">Status Sesi</th>
                      <th className="p-4">Status Ujian</th>
                      <th className="p-4">Akun Terkunci</th>
                      <th className="p-4">Update Terakhir</th>
                      <th className="p-4 text-center">Operasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAndFilteredSiswa[kelasNama].map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{s.name}</td>
                        <td className="p-4"><StatusBadge status={s.status} /></td>
                        <td className="p-4"><StatusBadge status={s.status_ujian} /></td>
                        <td className="p-4 text-center">{s.login_locked ? "🔒" : "🔓"}</td>
                        <td className="p-4">{s.last_update ? new Date(s.last_update).toLocaleString('id-ID') : "-"}</td>
                        <td className="p-4">
                          <div className="flex justify-center items-center flex-wrap gap-2">
                            <ActionButton 
                              onClick={() => openConfirmation('RESET', s, `Anda yakin ingin mereset ujian untuk ${s.name}?`)}
                              icon="🔄" text="Reset" color="bg-yellow-500 hover:bg-yellow-600" tooltip="Reset Ujian"
                            />
                            <ActionButton 
                              onClick={() => bukaModalTambahWaktu(s)}
                              icon="⏱️" text="Waktu" color="bg-blue-500 hover:bg-blue-600" tooltip="Tambah Waktu"
                            />
                            <ActionButton 
                              onClick={() => openConfirmation('LOGOUT', s, `Anda yakin ingin mengeluarkan ${s.name} dari sesi?`)}
                              icon="🚪" text="Logout" color="bg-red-500 hover:bg-red-600" tooltip="Logout Paksa"
                            />
                            <ActionButton 
                              onClick={() => openConfirmation('TOGGLE_LOCK', s, `Anda yakin ingin ${s.login_locked ? 'membuka kunci' : 'mengunci'} akun ${s.name}?`)}
                              icon={s.login_locked ? "🔓" : "🔒"} text={s.login_locked ? "Buka" : "Kunci"} color={s.login_locked ? "bg-green-600 hover:bg-green-700" : "bg-gray-700 hover:bg-gray-800"} tooltip={s.login_locked ? "Buka Kunci Akun" : "Kunci Akun"}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal Tambah Waktu */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">⏱️ Tambah Waktu untuk {selectedUser?.name}</h2>
            <div className="flex gap-4 items-end mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Menit</label>
                <input type="number" value={menit} onChange={(e) => setMenit(e.target.value)} className="border px-3 py-2 w-24 rounded-md" min="0"/>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Detik</label>
                <input type="number" value={detik} onChange={(e) => setDetik(e.target.value)} className="border px-3 py-2 w-24 rounded-md" min="0" max="59"/>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowTimeModal(false)} className="px-4 py-2 bg-gray-200 rounded-md font-semibold hover:bg-gray-300">Batal</button>
              <button onClick={konfirmasiTambahWaktu} className="px-4 py-2 bg-blue-500 text-white rounded-md font-semibold hover:bg-blue-600">Tambahkan</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Konfirmasi Aksi */}
      <ConfirmationModal
          show={showConfirmModal}
          onHide={() => setShowConfirmModal(false)}
          onConfirm={handleConfirm}
          title="Konfirmasi Aksi"
          message={confirmPayload.message}
      />
    </div>
  );
}