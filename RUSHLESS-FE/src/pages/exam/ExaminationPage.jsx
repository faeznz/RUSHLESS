import React, { useEffect } from "react";
import useQueryParams from "../../hooks/useQueryParams";
import useExamAccess from "../../hooks/useExamAccess";
import ExamLayout from "../../components/exam/ExamLayout";
import ExamAccessDenied from "../../components/exam/ExamAccessDenied";
import LoadingSpinner from "../../components/shared/LoadingSpinner";
import { useNavigate } from "react-router-dom";
import useExamStore from "../../stores/useExamStore";
import api from "../../api/axiosInstance";

export default function ExaminationPage() {
  const { courseId, userId } = useQueryParams();
  const { sisaWaktu } = useExamStore();
  const navigate = useNavigate();
  const { isAllowed, isLoading, message } = useExamAccess(courseId, userId);

  useEffect(() => {
    if (sisaWaktu === 1) {
      const timer = setTimeout(() => {
        const endExam = async () => {
          try {
            const timeout = true;
            await api.post("/ujian/selesai", { courseId, userId, timeout });
            // reset localStorage supaya bisa mulai lagi
            localStorage.removeItem(`ujian_started_${courseId}_${userId}`);
          } catch (err) {
            console.error("Gagal akhiri ujian:", err);
          } finally {
            // apapun hasilnya, pindah ke /home
            navigate("/home");
          }
        };
        endExam();
      }, 1000); // delay 1 detik

      // bersihkan timer kalau effect dibatalkan
      return () => clearTimeout(timer);
    }
  }, [sisaWaktu, courseId, userId, navigate]);

  if (isLoading) return <LoadingSpinner />;
  if (!isAllowed) return <ExamAccessDenied message={message} />;

  return <ExamLayout />;
}
