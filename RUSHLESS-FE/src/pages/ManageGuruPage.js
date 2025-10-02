import React, { useEffect, useState, useMemo } from "react";
import { toast } from "../utils/toast";
import api from "../api";
import { FiSave, FiRotateCw, FiSearch } from "react-icons/fi";

const SkeletonLoader = () => (
  <div className="animate-pulse">
    <div className="h-12 bg-gray-200 rounded-t-lg"></div>
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="flex-1 grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-8 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ManageGuruPage = () => {
  const [guruList, setGuruList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [pengajaran, setPengajaran] = useState({});
  const [initialPengajaran, setInitialPengajaran] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(pengajaran) !== JSON.stringify(initialPengajaran);
  }, [pengajaran, initialPengajaran]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [guruRes, kelasRes, pengajaranRes] = await Promise.all([
          api.get("/gurus"),
          api.get("/kelas"),
          api.get("/guru-kelas"),
        ]);

        setGuruList(guruRes.data);
        setKelasList(kelasRes.data);

        const initPengajaran = {};
        pengajaranRes.data.forEach(({ guru_id, kelas }) => {
          if (!initPengajaran[guru_id]) {
            initPengajaran[guru_id] = [];
          }
          initPengajaran[guru_id].push(kelas);
        });
        setPengajaran(initPengajaran);
        setInitialPengajaran(initPengajaran);
      } catch (err) {
        console.error("❌ Gagal mengambil data:", err);
        toast.error("Gagal memuat data dari server.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleCheckboxChange = (guruId, kelas) => {
    setPengajaran((prev) => {
      const currentKelas = prev[guruId] || [];
      const isChecked = currentKelas.includes(kelas);
      const updatedKelas = isChecked
        ? currentKelas.filter((k) => k !== kelas)
        : [...currentKelas, kelas];
      return { ...prev, [guruId]: updatedKelas };
    });
  };

  const handleSelectAllKelasForGuru = (guruId) => {
    setPengajaran((prev) => ({
      ...prev,
      [guruId]: kelasList,
    }));
  };

  const handleDeselectAllKelasForGuru = (guruId) => {
    setPengajaran((prev) => ({
      ...prev,
      [guruId]: [],
    }));
  };

  const handleSelectAllGuruForKelas = (kelas) => {
    const newPengajaran = { ...pengajaran };
    guruList.forEach((guru) => {
      if (!newPengajaran[guru.id]) {
        newPengajaran[guru.id] = [];
      }
      if (!newPengajaran[guru.id].includes(kelas)) {
        newPengajaran[guru.id].push(kelas);
      }
    });
    setPengajaran(newPengajaran);
  };

  const handleDeselectAllGuruForKelas = (kelas) => {
    const newPengajaran = { ...pengajaran };
    guruList.forEach((guru) => {
      if (newPengajaran[guru.id]) {
        newPengajaran[guru.id] = newPengajaran[guru.id].filter(
          (k) => k !== kelas
        );
      }
    });
    setPengajaran(newPengajaran);
  };

  const handleSimpan = async () => {
    setIsSaving(true);
    try {
      await api.post("/guru-kelas/batch-update", { pengajaran });
      toast.success("Semua perubahan berhasil disimpan!");
      setInitialPengajaran(pengajaran);
    } catch (err) {
      console.error("❌ Gagal menyimpan:", err);
      toast.error("Gagal menyimpan perubahan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPengajaran(initialPengajaran);
    toast.info("Perubahan telah dibatalkan.");
  };

  // 🔎 filter guru berdasarkan search
  const filteredGuru = useMemo(() => {
    return guruList.filter((guru) =>
      guru.nama.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, guruList]);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
          <h1 className="text-3xl font-bold text-gray-800">
            Manajemen Kelas Guru
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={handleReset}
              disabled={!hasUnsavedChanges || isSaving}
              className={`flex items-center px-4 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm transition-all duration-200 ease-in-out
                ${
                  !hasUnsavedChanges || isSaving
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                }`}
            >
              <FiRotateCw className="mr-2" />
              Reset
            </button>
            <button
              onClick={handleSimpan}
              disabled={!hasUnsavedChanges || isSaving}
              className={`flex items-center px-4 py-2 font-semibold text-white rounded-md shadow-sm transition-all duration-200 ease-in-out
                ${
                  !hasUnsavedChanges || isSaving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                }`}
            >
              <FiSave className="mr-2" />
              {isSaving ? "Menyimpan..." : "Simpan Semua"}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-4 relative max-w-md">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama guru..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {loading ? (
          <SkeletonLoader />
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nama Guru
                  </th>
                  {kelasList.map((kelas) => (
                    <th
                      key={kelas}
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      <div className="flex flex-col items-center">
                        <span>{kelas}</span>
                        <div className="flex space-x-1 mt-1">
                          <button
                            onClick={() => handleSelectAllGuruForKelas(kelas)}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            All
                          </button>
                          <button
                            onClick={() =>
                              handleDeselectAllGuruForKelas(kelas)
                            }
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            None
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuru.length === 0 ? (
                  <tr>
                    <td
                      colSpan={kelasList.length + 1}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      Guru tidak ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredGuru.map((guru) => (
                    <tr key={guru.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {guru.nama}
                        </div>
                        <div className="flex space-x-1 mt-1">
                          <button
                            onClick={() => handleSelectAllKelasForGuru(guru.id)}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            All
                          </button>
                          <button
                            onClick={() =>
                              handleDeselectAllKelasForGuru(guru.id)
                            }
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            None
                          </button>
                        </div>
                      </td>
                      {kelasList.map((kelas) => (
                        <td
                          key={kelas}
                          className="px-6 py-4 whitespace-nowrap text-center"
                        >
                          <input
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            checked={
                              pengajaran[guru.id]?.includes(kelas) || false
                            }
                            onChange={() =>
                              handleCheckboxChange(guru.id, kelas)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageGuruPage;
