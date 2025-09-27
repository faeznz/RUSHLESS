import React, { useEffect, useState } from "react";
import useExamStore from "../../stores/useExamStore";
import useSSEStore from "../../stores/useSSEStore";
import useQueryParams from "../../hooks/useQueryParams";
import useExamAccess from "../../hooks/useExamAccess";
import JoditEditor from "jodit-react";
import api from "../../api/axiosInstance";
import ExamStartModal from "./ExamStartModal";
import ExamHeader from "./ExamHeader";

export default function ExamQuestion() {
  const {
    soal,
    currentIndex,
    fetchSoal,
    jawabanSiswa,
    handleJawab,
    sisaWaktu,
  } = useExamStore();

  const { connectPesertaSSE } = useSSEStore();
  const { courseId, userId } = useQueryParams();
  const { isAllowed, isLoading } = useExamAccess(courseId, userId);

  const currentSoal = soal?.[currentIndex];
  const [eventSource, setEventSource] = useState(null);
  const [showStartPopup, setShowStartPopup] = useState(() => {
    return !localStorage.getItem(`ujian_started_${courseId}_${userId}`);
  });
  const [loadingStart, setLoadingStart] = useState(false);

  // klik "Mulai Ujian"
  const handleStartExam = async () => {
    try {
      setLoadingStart(true);
      await api.post("/ujian/mulai", { courseId, userId });
      // await fetchSoal(courseId, userId);

      localStorage.setItem(`ujian_started_${courseId}_${userId}`, "1");
      setShowStartPopup(false);
    } catch (err) {
      console.error("❌ Gagal mulai ujian:", err);
      alert("Gagal memulai ujian, coba lagi.");
    } finally {
      setLoadingStart(false);
    }
  };

  useEffect(() => {
    if (isLoading) return;

    if (isAllowed) {
      // selalu connect SSE begitu halaman dibuka
      if (!eventSource) {
        const es = connectPesertaSSE(courseId, userId);
        setEventSource(es);
        fetchSoal(courseId, userId); // load soal (meskipun sebelum mulai ujian)
      }
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [isAllowed, isLoading, courseId, userId, connectPesertaSSE, fetchSoal]);

  if (isLoading) {
    return <div className="text-gray-500">Memeriksa akses ujian...</div>;
  }

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Anda tidak memiliki izin untuk mengikuti ujian ini.
      </div>
    );
  }

  if (showStartPopup) {
    return <ExamStartModal onStart={handleStartExam} loading={loadingStart} />;
  }

  if (!currentSoal) return <div className="text-gray-500">Memuat soal...</div>;

  const opsiArray = Array.isArray(currentSoal.opsi)
    ? currentSoal.opsi.filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <ExamHeader currentIndex={currentIndex} sisaWaktu={sisaWaktu} />

      <div
        className="prose max-w-none text-gray-800"
        dangerouslySetInnerHTML={{ __html: currentSoal.soal || "" }}
      />

      {currentSoal.tipe_soal === "pilihan_ganda" ? (
        <div className="space-y-3">
          {opsiArray.map((opsi, idx) => {
            const huruf = String.fromCharCode(65 + idx);
            const jawabanObj = jawabanSiswa[currentSoal.id] || {};
            const isSelected = jawabanObj.jawaban === idx;

            return (
              <label
                key={idx}
                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "bg-blue-50 border-blue-500 shadow-sm"
                    : "bg-white border-gray-300 hover:border-blue-400"
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
                  className={`flex items-center justify-center w-6 h-6 mr-4 border rounded-full text-sm font-bold ${
                    isSelected
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "border-gray-400 text-gray-600"
                  }`}
                >
                  {huruf}
                </span>
                <span
                  className="text-gray-700 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: opsi }}
                />
              </label>
            );
          })}
        </div>
      ) : (
        <JoditEditor
          value={jawabanSiswa?.[currentSoal.id] || ""}
          config={{ readonly: sisaWaktu <= 0, height: 200 }}
          onChange={(content) => handleJawab(currentSoal.id, content, userId)}
        />
      )}
    </div>
  );
}
