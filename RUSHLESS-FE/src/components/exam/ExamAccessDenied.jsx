import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";

export default function ExamAccessDenied({ message: propMessage }) {
  const nav = useNavigate();
  const location = useLocation();
  
  // ambil message dari props kalau ada, fallback ke state
  const message = propMessage || location.state?.message || null;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <FiAlertTriangle className="text-red-500 mx-auto text-5xl mb-4" />
        <h1 className="text-2xl font-bold text-red-700 mb-2">Akses Ditolak</h1>
        <p className="text-gray-600 max-w-sm">
          Silakan hubungi pengajar atau administrator.
        </p>

        {message && (
          <p className="text-sm text-gray-500 italic">{message}</p>
        )}

        <button
          onClick={() => nav("/home")}
          className="mt-6 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Kembali
        </button>
      </div>
    </div>
  );
}
