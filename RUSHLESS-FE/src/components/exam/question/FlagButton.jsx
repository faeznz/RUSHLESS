// FlagButton.jsx
import React from "react";

export default function FlagButton({ flagged, toggleRagu, currentSoalId, courseId, userId, attemp }) {
  return (
    <div className="mt-4 flex justify-center">
      <button
        onClick={() => toggleRagu(currentSoalId, courseId, userId, attemp ?? 1, !flagged)}
        className={`px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md active:scale-95
          ${flagged
            ? "bg-amber-50 border-amber-400 text-amber-700 hover:bg-amber-100"
            : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
      >
        <span className="mr-2">🚩</span>
        {flagged ? "Batal Ragu" : "Tandai Ragu"}
      </button>
    </div>
  );
}