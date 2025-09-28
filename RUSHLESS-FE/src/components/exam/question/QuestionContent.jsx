// QuestionContent.jsx
import React from "react";
import JoditEditor from "jodit-react";

export default function QuestionContent({
  currentSoal,
  jawabanObj,
  handleJawab,
  userId,
  sisaWaktu,
}) {
  let opsiArray = [];

  if (currentSoal.opsi) {
    if (typeof currentSoal.opsi === "string") {
      try {
        opsiArray = JSON.parse(currentSoal.opsi);
        if (!Array.isArray(opsiArray)) opsiArray = [opsiArray];
      } catch {
        opsiArray = currentSoal.opsi.split(",").map((o) => o.trim());
      }
    } else if (Array.isArray(currentSoal.opsi)) {
      opsiArray = currentSoal.opsi;
    } else {
      opsiArray = [String(currentSoal.opsi)];
    }
  }

  if (currentSoal.tipe_soal === "pilihan_ganda") {
    return (
      <div className="space-y-3">
        {opsiArray.map((opsi, idx) => {
          const huruf = String.fromCharCode(65 + idx);
          const isSelected = jawabanObj.jawaban === idx;

          return (
            <label
              key={idx}
              className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                isSelected
                  ? "bg-blue-50 border-blue-500"
                  : "bg-white border-gray-200 hover:border-blue-400"
              }`}
            >
              <input
                type="radio"
                name={`soal-${currentSoal.id}`}
                value={idx}
                checked={isSelected}
                onChange={() => handleJawab(currentSoal.id, idx, userId)}
                className="sr-only"
              />
              <span
                className={`flex items-center justify-center w-7 h-7 mr-4 border rounded-full text-sm font-bold transition ${
                  isSelected
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                {huruf}
              </span>
              <span
                className="text-gray-800 prose max-w-none"
                dangerouslySetInnerHTML={{ __html: opsi }}
              />
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <JoditEditor
        value={jawabanObj?.jawaban || ""}
        config={{
          readonly: sisaWaktu <= 0,
          height: 240,
          toolbar: sisaWaktu <= 0 ? false : undefined,
        }}
        onChange={(content) => handleJawab(currentSoal.id, content, userId)}
      />
    </div>
  );
}