import React from "react";

export default function ExamStartModal({ onStart, loading }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
      <div className="bg-white rounded-xl p-6 w-96 text-center shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Mulai Ujian?</h2>
        <p className="text-gray-600 mb-6">
          Setelah ujian dimulai, waktu akan berjalan otomatis.
        </p>
        <button
          onClick={onStart}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Memulai..." : "Start Ujian"}
        </button>
      </div>
    </div>
  );
}
