// ExamHeader.jsx
import React from "react";
import ExamTimer from "./ExamTimer";
import useUIStore from "../../stores/useUIStore";

export default function ExamHeader({ currentIndex, sisaWaktu }) {
  const { setShowSidebar } = useUIStore();

  return (
    <div className="flex flex-col gap-4 w-full">
        <ExamTimer sisaWaktu={sisaWaktu} />
        <div className="w-full flex flex-row justify-between">
          <h2 className="text-lg font-semibold">Soal {currentIndex + 1}</h2>
          <div className="md:hidden">
            <button
              onClick={() => setShowSidebar(true)}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              📑 Daftar Soal
            </button>
          </div>
        </div>
    </div>
  );
}
