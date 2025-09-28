// NavigationButtons.jsx
import React from "react";

export default function NavigationButtons({ currentIndex, soalLength, setCurrentIndex }) {
  return (
    <div className="flex justify-center gap-3 w-full lg:w-1/2 mt-6">
      <button
        className={`px-4 py-3 w-full rounded-xl font-medium transition-all transform hover:scale-105 shadow-md
          ${currentIndex <= 0
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-lg"
          }`}
        onClick={() => setCurrentIndex(currentIndex - 1)}
        disabled={currentIndex <= 0}
      >
        ← Sebelumnya
      </button>

      <button
        className={`px-4 py-3 w-full rounded-xl font-medium transition-all transform hover:scale-105 shadow-md
          ${currentIndex >= soalLength - 1
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:shadow-lg"
          }`}
        onClick={() => setCurrentIndex(currentIndex + 1)}
        disabled={currentIndex >= soalLength - 1}
      >
        Selanjutnya →
      </button>
    </div>
  );
}