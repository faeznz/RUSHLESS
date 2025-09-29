import { create } from "zustand";
import api from "../api/axiosInstance";

const useExamStore = create((set, get) => ({
  /* state peserta */
  soal: [],
  currentIndex: 0,
  jawabanSiswa: {}, // { [soalId]: { jawaban, attemp, flag } }
  sisaWaktu: null,

  /* actions peserta */
  fetchSoal: async (courseId, userId) => {
    try {
      const res = await api.get(`/ujian/course/soal`, { params: { courseId, userId } });
      const soalData = res.data.data.map((item) => ({
        ...item,
        opsi:
          typeof item.opsi === "string"
            ? JSON.parse(item.opsi)
            : Array.isArray(item.opsi)
            ? item.opsi
            : [],
      }));
      set({ soal: soalData, currentIndex: 0 });
    } catch (err) {
      console.error("Gagal fetch soal:", err);
    }
  },

  handleJawab: async (soalId, answer, userId) => {
    const { soal } = get();
    const currentSoal = soal.find((s) => String(s.id) === String(soalId));
    if (!currentSoal) return;

    console.log(answer)

    const jawabanToSend =
      typeof answer === "number" ? String.fromCharCode(65 + answer) : answer;

    try {
      await api.post("/ujian/jawab", {
        userId,
        courseId: currentSoal.course_id,
        soalId,
        jawaban: jawabanToSend,
        attemp: 1,
      });

      // update state lokal
      set((state) => ({
        jawabanSiswa: {
          ...state.jawabanSiswa,
          [soalId]: {
            ...(state.jawabanSiswa[soalId] || {}),
            jawaban: jawabanToSend,
            attemp: 1,
          },
        },
      }));
    } catch (err) {
      console.error("Gagal kirim jawaban:", err);
    }
  },

  toggleRagu: async (soalId, courseId, userId, attemp, flag) => {
    try {
      await api.post("/ujian/ragu", {
        courseId,
        soalId,
        userId,
        attemp,
        flag,
      });

      // update state lokal
      set((state) => ({
        jawabanSiswa: {
          ...state.jawabanSiswa,
          [soalId]: {
            ...(state.jawabanSiswa[soalId] || {}),
            attemp: attemp ?? null,
            flag,
          },
        },
      }));
    } catch (err) {
      console.error("❌ Gagal update flag:", err);
    }
  },

  setCurrentIndex: (index) =>
    set((s) =>
      index >= 0 && index < s.soal.length ? { currentIndex: index } : s
    ),
}));

export default useExamStore;