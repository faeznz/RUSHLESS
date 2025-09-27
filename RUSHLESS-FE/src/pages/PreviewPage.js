import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";

function toAbsoluteImageSrc(html) {
  if (!html) return '';
  const baseURL = api.defaults.baseURL;
  return html.replace(/src="\/uploads/g, `src="${baseURL}/uploads`);
}

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const QuestionCard = ({ question, index }) => {
  const opsi = useMemo(() => {
    try {
      const parsedOpsi = Array.isArray(question.opsi) ? question.opsi : JSON.parse(question.opsi || "[]");
      // Membersihkan label huruf (misal: "A. ", "B. ") dari setiap opsi
      return parsedOpsi.map(opsiText => 
        typeof opsiText === 'string' ? opsiText.replace(/^[A-Z]\.\s*/, '') : opsiText
      );
    } catch {
      return [];
    }
  }, [question.opsi]);

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-lg">
      <div className="flex items-start">
        <span className="text-xl font-bold text-white bg-blue-600 rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center mr-5">
          {index + 1}
        </span>
        <div className="prose max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(question.soal) }} />
      </div>
      <div className="pl-14 mt-6 space-y-3">
        {opsi.map((opsiText, i) => (
          <div
            key={i}
            className="flex items-start p-4 rounded-lg bg-gray-50 border-2 border-gray-200"
          >
            <span className="font-bold text-lg mr-4 text-gray-600">
              {String.fromCharCode(65 + i)}.
            </span>
            <div className="prose max-w-none flex-1" dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(opsiText) }} />
          </div>
        ))}
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600"></div>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-lg shadow-md" role="alert">
    <p className="font-bold text-lg">Terjadi Kesalahan</p>
    <p className="mt-2">{message}</p>
  </div>
);

const PreviewPage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const [soalList, setSoalList] = useState([]);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPreviewSoal = async () => {
      try {
        setLoading(true);
        const configRes = await api.get(`/courses/${courseId}`);
        const { acakSoal, acakJawaban, nama } = configRes.data;
        setCourseName(nama);

        const soalRes = await api.get(`/courses/${courseId}/questions`);
        const rawSoal = soalRes.data;

        const soalFinal = (acakSoal ? shuffleArray(rawSoal) : rawSoal).map((soal) => {
          const opsiOriginal = Array.isArray(soal.opsi) ? soal.opsi : JSON.parse(soal.opsi || "[]");
          const opsiFinal = acakJawaban ? shuffleArray([...opsiOriginal]) : [...opsiOriginal];
          return { ...soal, opsi: opsiFinal };
        });

        setSoalList(soalFinal);
      } catch (err) {
        console.error("❌ Gagal ambil soal preview:", err);
        setError("Gagal memuat soal. Pastikan koneksi dan server tersedia.");
      } finally {
        setLoading(false);
      }
    };

    fetchPreviewSoal();
  }, [courseId]);

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <header className="mb-10 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">{courseName || "Preview Soal"}</h1>
              <p className="text-gray-600 mt-2 text-lg">Berikut adalah daftar soal dan pilihan jawabannya.</p>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Kembali
            </button>
          </div>
        </header>

        <main>
          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <div className="space-y-8">
              {soalList.map((soal, index) => (
                <QuestionCard key={soal.id || index} question={soal} index={index} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default PreviewPage;
