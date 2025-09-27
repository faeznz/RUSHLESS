import React from "react";
import useExamStore from "../../stores/useExamStore";
import useQueryParams from "../../hooks/useQueryParams";

export default function ExamQuestionGrid() {
  const { soal, currentIndex, setCurrentIndex, jawabanSiswa, toggleRagu } = useExamStore();
  const { courseId, userId } = useQueryParams();

  const currentSoal = soal[currentIndex];
  const jawabanObj = currentSoal ? jawabanSiswa[currentSoal.id] || {} : {};
  const flagged = jawabanObj.flag;

  return (
    <div>
      <h3 className="text-md font-semibold mb-2">Daftar Soal</h3>
      <div className="grid grid-cols-5 gap-2">
        {soal.map((s, i) => {
          const jawabanObj = jawabanSiswa[s.id] || {};
          const sudahDijawab =
            jawabanObj.jawaban !== undefined && jawabanObj.jawaban !== null;
          const flagged = jawabanObj.flag;

          let btnClass = "bg-gray-100 hover:bg-gray-200"; // default
          if (currentIndex === i) {
            btnClass = "bg-blue-500 text-white"; // soal aktif
          } else if (flagged) {
            btnClass = "bg-yellow-400 text-white hover:bg-yellow-500"; // ragu
          } else if (sudahDijawab) {
            btnClass = "bg-green-400 text-white hover:bg-green-500"; // sudah dijawab
          }

          return (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 flex items-center justify-center rounded border ${btnClass}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* tombol ragu hanya tampil untuk soal aktif */}
      {currentSoal && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() =>
              toggleRagu(
                currentSoal.id,
                courseId,
                userId,
                jawabanObj.attemp ?? 1,
                !flagged
              )
            }
            className="text-sm px-3 py-1 rounded border bg-yellow-100 hover:bg-yellow-200"
          >
            {flagged ? "Batal Ragu" : "Tandai Ragu"}
          </button>
        </div>
      )}
    </div>
  );
}
