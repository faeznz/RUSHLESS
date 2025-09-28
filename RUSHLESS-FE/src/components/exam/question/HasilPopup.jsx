// HasilPopup.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";

export default function HasilPopup({ courseId, userId, setShowHasilPopup, attemp }) {
  const navigate = useNavigate();
  const [hasilUjian, setHasilUjian] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHasil = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/courses/${courseId}/user/${userId}/hasil?attemp=${attemp}`);
        setHasilUjian(res.data);
      } catch (err) {
        console.error("❌ Gagal mengambil hasil ujian:", err);
        setError("Gagal mengambil hasil ujian.");
      } finally {
        setLoading(false);
      }
    };

    fetchHasil();
  }, [courseId, userId, attemp]);

  if (loading)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-fade-in">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-700">Memuat hasil ujian...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-fade-in">
          <div className="text-red-500 mb-2 text-2xl">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
          <button
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            onClick={() => setShowHasilPopup(false)}
          >
            Tutup
          </button>
        </div>
      </div>
    );

  if (!hasilUjian) return null;

  const benar = hasilUjian.summary?.benar ?? 0;
  const salah = hasilUjian.summary?.salah ?? 0;
  const total = benar + salah;
  const persentase = total > 0 ? Math.round((benar / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Hasil Ujian</h2>
          <button
            onClick={() => setShowHasilPopup(false)}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Nilai Anda</span>
            <span className="text-3xl font-bold text-blue-600">{persentase}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${persentase}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
            <div className="text-green-600 text-2xl mb-1">✅</div>
            <div className="text-sm text-gray-600">Benar</div>
            <div className="text-xl font-bold text-green-700">{benar}</div>
          </div>
          <div className="bg-red-50 p-4 rounded-xl border border-red-200">
            <div className="text-red-600 text-2xl mb-1">❌</div>
            <div className="text-sm text-gray-600">Salah</div>
            <div className="text-xl font-bold text-red-700">{salah}</div>
          </div>
        </div>

        <button
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
          onClick={() => {
            setShowHasilPopup(false);
            navigate("/home");
          }}
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}