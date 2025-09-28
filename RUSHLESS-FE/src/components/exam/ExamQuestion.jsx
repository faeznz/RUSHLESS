import React, { useEffect, useState } from "react";
import useExamStore from "../../stores/useExamStore";
import useSSEStore from "../../stores/useSSEStore";
import useQueryParams from "../../hooks/useQueryParams";
import useExamAccess from "../../hooks/useExamAccess";
import JoditEditor from "jodit-react";
import api from "../../api/axiosInstance";
import ExamStartModal from "./ExamStartModal";
import ExamHeader from "./ExamHeader";
import { useNavigate } from "react-router-dom";

import QuestionContent from "./question/QuestionContent";
import FlagButton from "./question/FlagButton";
import NavigationButtons from "./question/NavigationButtons";
import EndExamButton from "./question/EndExamButton";
import HasilPopup from "./question/HasilPopup";

export default function ExamQuestion() {
  const {
    soal,
    currentIndex,
    fetchSoal,
    jawabanSiswa,
    handleJawab,
    sisaWaktu,
    toggleRagu,
    setCurrentIndex,
  } = useExamStore();

  const { connectPesertaSSE } = useSSEStore();
  const { courseId, userId } = useQueryParams();
  const { isAllowed, isLoading } = useExamAccess(courseId, userId);

  const currentSoal = soal?.[currentIndex];
  const jawabanObj = currentSoal ? jawabanSiswa[currentSoal.id] || {} : {};
  const flagged = jawabanObj.flag;
  const [eventSource, setEventSource] = useState(null);
  const [showStartPopup, setShowStartPopup] = useState(() => {
    return !localStorage.getItem(`ujian_started_${courseId}_${userId}`);
  });
  const [loadingStart, setLoadingStart] = useState(false);
  const [allAnswered, setAllAnswered] = useState(false);

  const [hasilUjian, setHasilUjian] = useState(null);
  const [showHasilPopup, setShowHasilPopup] = useState(false);

  const navigate = useNavigate();

  // klik "Mulai Ujian"
  const handleStartExam = async () => {
  try {
    setLoadingStart(true);
    await api.post("/ujian/mulai", { courseId, userId });

    localStorage.setItem(`ujian_started_${courseId}_${userId}`, "1");
    setShowStartPopup(false);

    // ⬅️ panggil ulang fetch soal supaya jawaban siswa up-to-date
    fetchSoal(courseId, userId);
    window.location.reload();
  } catch (err) {
    console.error("❌ Gagal mulai ujian:", err);
    alert("Gagal memulai ujian, coba lagi.");
  } finally {
    setLoadingStart(false);
  }
};

  // klik "Akhiri Ujian"
  const handleEndExam = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengakhiri ujian?")) return;

    try {
      const res = await api.post("/ujian/selesai", { courseId, userId });
      localStorage.removeItem(`ujian_started_${courseId}_${userId}`);

      if (res.data.tampilkanHasil) {
        setHasilUjian(res.data); // simpan hasil
        setShowHasilPopup(true); // tampilkan popup
      } else {
        navigate("/home"); // langsung ke home
      }
    } catch (err) {
      console.error("❌ Gagal akhiri ujian:", err);
      const msg =
        err.response?.data?.message || "Gagal mengakhiri ujian, coba lagi.";
      alert(msg);
    }
  };

  // update SSE & fetch soal
  useEffect(() => {
    if (isLoading) return;

    if (isAllowed && !eventSource) {
      const es = connectPesertaSSE(courseId, userId);
      setEventSource(es);
      fetchSoal(courseId, userId);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [isAllowed, isLoading, courseId, userId, connectPesertaSSE, fetchSoal]);

  // cek semua soal sudah dijawab
  useEffect(() => {
    if (soal.length === 0) return;
    const answered = soal.every((s) => {
      const jawaban = jawabanSiswa[s.id];
      if (!jawaban) return false;
      // untuk PG
      if (jawaban.jawaban !== undefined && jawaban.jawaban !== null)
        return true;
      // untuk essay / teks
      if (typeof jawaban === "string" && jawaban.trim() !== "") return true;
      return false;
    });
    setAllAnswered(answered);
  }, [soal, jawabanSiswa]);

  if (isLoading)
    return <div className="text-gray-500">Memeriksa akses ujian...</div>;

  if (!isAllowed)
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600">
        Anda tidak memiliki izin untuk mengikuti ujian ini.
      </div>
    );

  if (showStartPopup)
    return <ExamStartModal onStart={handleStartExam} loading={loadingStart} />;

  if (!currentSoal) return <div className="text-gray-500">Memuat soal...</div>;

  // parsing opsi aman
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

  return (
    <div className="space-y-6">
      <ExamHeader currentIndex={currentIndex} sisaWaktu={sisaWaktu} />

      <div
        className="prose max-w-none text-gray-800"
        dangerouslySetInnerHTML={{ __html: currentSoal.soal || "" }}
      />

      <QuestionContent
        currentSoal={currentSoal}
        jawabanObj={jawabanObj}
        handleJawab={handleJawab}
        userId={userId}
        sisaWaktu={sisaWaktu}
      />

      <FlagButton
        flagged={flagged}
        toggleRagu={toggleRagu}
        currentSoalId={currentSoal.id}
        courseId={courseId}
        userId={userId}
        attemp={jawabanObj.attemp}
      />

      <div className="w-full flex flex-col justify-center items-center">
        <NavigationButtons
          currentIndex={currentIndex}
          soalLength={soal.length}
          setCurrentIndex={setCurrentIndex}
        />

        <EndExamButton
          allAnswered={allAnswered}
          handleEndExam={handleEndExam}
        />
      </div>

      {showHasilPopup && (
  <HasilPopup
    hasilUjian={hasilUjian}
    setShowHasilPopup={setShowHasilPopup}
    courseId={courseId}
    userId={userId}
    attemp={jawabanObj.attemp}
  />
)}
    </div>
  );
}
