import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

const ScoreCard = ({ score, total }) => {
  const persen = Math.round((score / total) * 100);

  const getMessage = () => {
    if (persen === 100) return "🎉 Sempurna! Kamu menjawab semua soal dengan benar!";
    if (persen >= 80) return "✨ Hebat! Kamu menjawab sebagian besar soal dengan benar.";
    if (persen >= 50) return "💪 Terus berlatih! Kamu sudah menjawab lebih dari setengahnya.";
    return "🧠 Jangan menyerah! Terus belajar dan coba lagi nanti.";
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-lg border text-center space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Skor Ujian</h2>

      <p className="text-5xl font-extrabold text-blue-600">
        {persen} <span className="text-3xl text-gray-500">/ 100</span>
      </p>

      <p className="text-sm text-gray-500">
        ({score} dari {total} soal benar)
      </p>

      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
        <div
          className="bg-blue-500 h-full transition-all duration-500"
          style={{ width: `${persen}%` }}
        ></div>
      </div>

      <p className="text-gray-600 text-lg">{getMessage()}</p>
    </div>
  );
};

const AnswerSummaryPage = () => {
  const { courseId, userId, attemp } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examData, setExamData] = useState({ questions: [], studentName: '' });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/courses/${courseId}/user/${userId}/hasil?attemp=${attemp}`);
        if (res.data && res.data.length > 0) {
          setExamData({
            questions: res.data,
            studentName: res.data[0].siswa_name || 'Siswa',
          });
        } else {
          setError('Data tidak ditemukan.');
        }
      } catch (err) {
        console.error('❌ Gagal ambil data ringkasan:', err);
        setError('Terjadi kesalahan saat mengambil data.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [courseId, userId, attemp]);

  const { pgQuestions, essayQuestions } = useMemo(() => {
    const pg = examData.questions.filter(q => q.tipe_soal !== 'esai');
    const essay = examData.questions.filter(q => q.tipe_soal === 'esai');
    return { pgQuestions: pg, essayQuestions: essay };
  }, [examData.questions]);

  const score = useMemo(() => {
    return pgQuestions.reduce((acc, q) => {
      return q.jawaban_siswa === q.jawaban_benar ? acc + 1 : acc;
    }, 0);
  }, [pgQuestions]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">Ringkasan Hasil Ujian</h1>
          <p className="text-gray-600 mt-2">
            Attempt ke-{attemp} oleh <span className="text-blue-600 font-semibold">{examData.studentName}</span>
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-opacity-50"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg border border-red-400 text-center">
            {error}
          </div>
        ) : (
          <ScoreCard score={score} total={pgQuestions.length} />
        )}

        <div className="text-center">
          <button
            onClick={() => navigate('/courses')}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Kembali ke Kursus
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnswerSummaryPage;
