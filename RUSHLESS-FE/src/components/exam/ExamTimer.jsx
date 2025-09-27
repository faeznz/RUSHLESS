import React from "react";
import formatTime from "../../utils/formatTime";

export default function ExamTimer({ sisaWaktu }) {
  if (sisaWaktu === null) return null;

  return (
    <div
      className={`p-3 rounded-md text-white font-bold ${
        sisaWaktu > 60 ? "bg-green-600" : "bg-red-600"
      }`}
    >
      ⏱ Sisa Waktu: {formatTime.formatTimer(sisaWaktu)}
    </div>
  );
}
