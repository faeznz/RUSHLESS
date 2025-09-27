// src/hooks/useExamAccess.js
import { useState, useEffect } from "react";
import api from "../api/axiosInstance";

export default function useExamAccess(courseId, userId) {
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!courseId || !userId) return;

    const fetchPermission = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(
          `/ujian/course/${courseId}/${userId}/permission`
        );

        setIsAllowed(res.data.allowed);
        setMessage(res.data.message || null);
      } catch (err) {
        console.error("Error fetching permission:", err);
        setIsAllowed(false);
        setMessage(
          err.response?.data?.message || "Terjadi kesalahan saat cek izin."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermission();
  }, [courseId, userId]);

  return { isAllowed, isLoading, message };
}
