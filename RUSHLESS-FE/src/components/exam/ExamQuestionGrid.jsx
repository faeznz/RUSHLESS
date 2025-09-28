import React from "react";
import useExamStore from "../../stores/useExamStore";
import useQueryParams from "../../hooks/useQueryParams";

export default function ExamQuestionGrid() {
  const { soal, currentIndex, setCurrentIndex, jawabanSiswa } = useExamStore();
  const { courseId, userId } = useQueryParams();

  return (
    <div className="">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Daftar Soal</h3>
      <div className="grid grid-cols-5 gap-12">
        {soal.map((s, i) => {
          const jawabanObj = jawabanSiswa[s.id] || {};
          const sudahDijawab =
            jawabanObj.jawaban !== undefined && jawabanObj.jawaban !== null;
          const flagged = jawabanObj.flag;

          let btnClass =
            "w-12 h-12 rounded-xl border-2 font-semibold text-sm transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md active:scale-95";

          if (currentIndex === i) {
            btnClass += " bg-blue-500 text-white border-blue-600"; // aktif
          } else if (flagged) {
            btnClass += " bg-amber-400 text-white border-amber-500"; // ragu
          } else if (sudahDijawab) {
            btnClass += " bg-emerald-400 text-white border-emerald-500"; // sudah
          } else {
            btnClass += " bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"; // belum
          }

          return (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(i)}
              className={btnClass}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}