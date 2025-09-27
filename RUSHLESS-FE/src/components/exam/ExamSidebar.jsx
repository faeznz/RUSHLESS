import React from "react";
import { useNavigate } from "react-router-dom";
import useExamStore from "../../stores/useExamStore";
import useQueryParams from "../../hooks/useQueryParams";
import api from "../../api/axiosInstance";
import ExamQuestionGrid from "./ExamQuestionGrid";

export default function ExamSidebar() {
  const { currentIndex, setCurrentIndex, soal } = useExamStore();
  const { courseId, userId } = useQueryParams();
  const navigate = useNavigate(); // <-- hook navigate

  const handleEndExam = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengakhiri ujian?")) return;

    try {
      await api.post("/ujian/selesai", { courseId, userId });
      // reset localStorage supaya bisa mulai lagi
      localStorage.removeItem(`ujian_started_${courseId}_${userId}`);
      // navigasi ke home tanpa reload
      navigate("/home");
    } catch (err) {
      console.error("❌ Gagal akhiri ujian:", err);

      // baca pesan dari server kalau ada
      const msg =
        err.response?.data?.message || "Gagal mengakhiri ujian, coba lagi.";
      alert(msg);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between">
        <button
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => setCurrentIndex(currentIndex - 1)}
          disabled={currentIndex <= 0}
        >
          Sebelumnya
        </button>

        <button
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          onClick={() => setCurrentIndex(currentIndex + 1)}
          disabled={currentIndex >= soal.length - 1}
        >
          Selanjutnya
        </button>
      </div>

      <button
        className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        onClick={handleEndExam}
      >
        Akhiri Ujian
      </button>

      <hr className="my-2" />

      <ExamQuestionGrid />
    </div>
  );
}
