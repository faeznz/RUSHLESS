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

  

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
        <ExamQuestionGrid />

      {/* <div className="flex justify-between">
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
      </button> */}

    </div>
  );
}
