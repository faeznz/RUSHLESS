import React from "react";
import ExamTimer from "./ExamTimer";

export default function ExamHeader({ currentIndex, sisaWaktu }) {
  return (
    <div className="space-y-3">
      {/* Timer */}
      <ExamTimer sisaWaktu={sisaWaktu} />

      {/* Nomor Soal */}
      <h2 className="text-lg font-semibold">Soal {currentIndex + 1}</h2>
    </div>
  );
}
