// EndExamButton.jsx
import React from "react";

export default function EndExamButton({ allAnswered, handleEndExam }) {
  if (!allAnswered) return null;

  return (
    <button
      className="w-full lg:w-1/3 mt-6 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-red-600 hover:to-rose-700 transition-all transform hover:scale-105 active:scale-95"
      onClick={handleEndExam}
    >
      Akhiri Ujian
    </button>
  );
}