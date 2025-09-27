import React, { useState, useEffect, useRef } from "react";
import api from "../api";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiXCircle,
  FiLoader,
  FiUsers,
} from "react-icons/fi";
import { toast } from "../utils/toast";

const KelasManagement = () => {
  const [namaKelas, setNamaKelas] = useState("");
  const [daftarKelas, setDaftarKelas] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editNama, setEditNama] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const editInputRef = useRef(null);

  const fetchKelas = async () => {
    try {
      const res = await api.get("/data/kelas");
      setDaftarKelas(res.data);
    } catch (err) {
      toast.error("Gagal mengambil data kelas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKelas();
  }, []);

  useEffect(() => {
    if (editId !== null && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editId]);

  const handleTambah = async (e) => {
    e.preventDefault();
    if (!namaKelas.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await api.post("/data/kelas", { nama_kelas: namaKelas });
      toast.success("Kelas berhasil ditambahkan");
      setNamaKelas("");
      setShowModal(false);
      await fetchKelas();
    } catch (err) {
      toast.error("Gagal menambahkan kelas");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHapus = async (id) => {
    if (!window.confirm("Yakin ingin menghapus kelas ini?")) return;

    const backup = [...daftarKelas];
    setDaftarKelas(daftarKelas.filter((k) => k.id !== id));

    try {
      await api.delete(`/data/kelas/${id}`);
      toast.success("Kelas berhasil dihapus");
    } catch (err) {
      toast.error("Gagal menghapus kelas");
      setDaftarKelas(backup);
    }
  };

  const handleEdit = (kelas) => {
    setEditId(kelas.id);
    setEditNama(kelas.nama_kelas);
  };

  const handleBatalEdit = () => {
    setEditId(null);
    setEditNama("");
  };

  const handleSimpan = async (id) => {
    if (!editNama.trim()) return;

    try {
      await api.put(`/data/kelas/${id}`, { nama_kelas: editNama });
      toast.success("Kelas berhasil diperbarui");
      setDaftarKelas((prev) =>
        prev.map((k) => (k.id === id ? { ...k, nama_kelas: editNama } : k))
      );
      handleBatalEdit();
    } catch (err) {
      toast.error("Gagal memperbarui kelas");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Manajemen Kelas</h1>
            <p className="text-slate-500 mt-1">
              Tambah, ubah, atau hapus daftar kelas yang tersedia.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            <FiPlus />
            Tambah Kelas
          </button>
        </header>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md animate-fade-in">
              <h2 className="text-xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
                <FiUsers />
                Tambah Kelas Baru
              </h2>

              <form onSubmit={handleTambah} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Contoh: XII-RPL-1"
                  value={namaKelas}
                  onChange={(e) => setNamaKelas(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300"
                  >
                    {isSubmitting ? <FiLoader className="animate-spin" /> : <FiPlus />}
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-100 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-sm font-semibold text-slate-600">NAMA KELAS</th>
                  <th className="p-4 text-sm font-semibold text-slate-600 text-right">AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="2" className="text-center p-10">
                      <FiLoader className="animate-spin text-2xl text-indigo-500 mx-auto" />
                    </td>
                  </tr>
                ) : daftarKelas.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="text-center p-10">
                      <FiXCircle className="mx-auto text-4xl text-slate-400 mb-2" />
                      <p className="font-semibold text-slate-600">Belum ada kelas</p>
                      <p className="text-sm text-slate-500">Silakan tambahkan kelas baru.</p>
                    </td>
                  </tr>
                ) : (
                  daftarKelas.map((kelas) => (
                    <tr key={kelas.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-4">
                        {editId === kelas.id ? (
                          <input
                            ref={editInputRef}
                            value={editNama}
                            onChange={(e) => setEditNama(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleSimpan(kelas.id)
                            }
                            className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-indigo-400"
                          />
                        ) : (
                          <span className="text-slate-800 font-medium">
                            {kelas.nama_kelas}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {editId === kelas.id ? (
                            <>
                              <button
                                onClick={() => handleSimpan(kelas.id)}
                                className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"
                                title="Simpan"
                              >
                                <FiSave />
                              </button>
                              <button
                                onClick={handleBatalEdit}
                                className="p-2 bg-gray-400 text-white rounded-full hover:bg-gray-500"
                                title="Batal"
                              >
                                <FiXCircle />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(kelas)}
                                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                                title="Edit"
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                onClick={() => handleHapus(kelas.id)}
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                                title="Hapus"
                              >
                                <FiTrash2 />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KelasManagement;
