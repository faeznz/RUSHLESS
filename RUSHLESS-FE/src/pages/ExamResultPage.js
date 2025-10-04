import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const ScoreCard = ({ score, totalQuestions, studentName }) => {
  const persen = Math.round((score / totalQuestions) * 100);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 text-center space-y-4">
      <h3 className="text-xl font-semibold text-gray-600">Nilai {studentName}</h3>

      <p className="text-5xl font-extrabold text-blue-600">
        {persen} <span className="text-3xl text-gray-400">/ 100</span>
      </p>

      <p className="text-sm text-gray-500">
        ({score} dari {totalQuestions} soal benar)
      </p>

      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden mt-3">
        <div
          className="bg-blue-500 h-full transition-all duration-500"
          style={{ width: `${persen}%` }}
        ></div>
      </div>
    </div>
  );
};

function toAbsoluteImageSrc(html) {
  const baseURL = api.defaults.baseURL;

  return html.replace(/src="\/uploads/g, `src="${baseURL}/uploads`);
}

const QuestionCard = ({ question, index, studentName }) => {
  const isEssay = question.tipe_soal === 'esai';

  const opsi = useMemo(() => {
    if (isEssay) return [];
    try {
      return Array.isArray(question.opsi) ? question.opsi : JSON.parse(question.opsi || '[]');
    } catch {
      return [];
    }
  }, [question.opsi, isEssay]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 transition-shadow hover:shadow-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-5 flex items-start">
        <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 flex-shrink-0">{index + 1}</span>
        <span dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(question.soal) }} />
      </h2>

      {isEssay ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-2">Jawaban Siswa:</h3>
          <div 
            className="prose max-w-none p-4 bg-gray-50 rounded-md border"
            dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(question.jawaban_siswa || '<p class="text-gray-400 italic">Tidak ada jawaban.</p>') }} 
          />
        </div>
      ) : (
        <ul className="space-y-3">
          {opsi.map((opsiText, i) => (
            <Option
              key={i}
              index={i}
              text={opsiText}
              isCorrect={String.fromCharCode(65 + i) === question.jawaban_benar}
              isSelected={question.jawaban_siswa && question.jawaban_siswa.toUpperCase() === String.fromCharCode(65 + i)}
              studentName={studentName}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

const Option = ({ index, text, isCorrect, isSelected, studentName }) => {
  const getOptionLabel = (idx) => String.fromCharCode(65 + idx);
  const label = getOptionLabel(index);
  const firstName = studentName ? studentName.split(' ')[0] : 'Siswa';

  let style = 'bg-gray-100 border-gray-200 text-gray-700';
  let icon = null;

  if (isSelected && isCorrect) {
    style = 'bg-green-100 border-green-300 text-green-800 font-semibold';
    icon = <span className="text-green-500">✔ Jawaban {firstName} (Benar)</span>;
  } else if (isSelected && !isCorrect) {
    style = 'bg-red-100 border-red-300 text-red-800 font-semibold';
    icon = <span className="text-red-500">✖ Jawaban {firstName} (Salah)</span>;
  } else if (isCorrect) {
    style = 'bg-green-100 border-green-300 text-green-800';
    icon = <span className="text-green-600">✔ Kunci Jawaban</span>;
  }

  return (
    <li className={`p-4 rounded-lg border flex justify-between items-center transition-colors ${style}`}>
      <span className="prose max-w-none text-sm" dangerouslySetInnerHTML={{ __html: toAbsoluteImageSrc(text) }} />

      {icon && <span className="text-sm font-bold">{icon}</span>}
    </li>
  );
};

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
  </div>
);

const ErrorMessage = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
    <p className="font-bold">Terjadi Kesalahan</p>
    <p>{message}</p>
  </div>
);

const ExamResultPage = () => {
  const { courseId, userId, attemp } = useParams();
  const [examData, setExamData] = useState({ questions: [], studentName: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        // The backend now provides all necessary data in a single call.
        const res = await api.get(`/courses/${courseId}/user/${userId}/hasil?attemp=${attemp}`);
        const resultData = res.data;

        // The array of questions/answers is nested in the `data` property.
        if (!resultData || !Array.isArray(resultData.data) || resultData.data.length === 0) {
          setError('Data hasil ujian tidak valid atau tidak ditemukan.');
          return;
        }

        setExamData({
          questions: resultData.data,
          studentName: resultData.data[0]?.siswa_name || 'Siswa',
        });

      } catch (err) {
        console.error('❌ Gagal ambil hasil ujian:', err);
        setError('Tidak dapat memuat hasil ujian. Silakan coba lagi nanti.');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [courseId, userId, attemp]);

  const handleDownloadExcel = () => {
    if (!examData.questions || examData.questions.length === 0) return;
  
    const worksheetData = [
      ['Nama', 'Attempt ke', 'No', 'Jawaban Siswa', 'Jawaban Benar', 'Skor']
    ];
  
    let benar = 0;
  
    examData.questions.forEach((q, i) => {
      const isCorrect = q.jawaban_siswa === q.jawaban_benar;
      if (isCorrect) benar += 1;
  
      worksheetData.push([
        examData.studentName,
        attemp,
        i + 1,
        q.jawaban_siswa || '-',
        q.jawaban_benar || '-',
        isCorrect ? 1 : 0
      ]);
    });
  
    worksheetData.push(['', '', '', '', 'Total Skor', benar]);
  
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Ujian');
  
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });
  
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  
    saveAs(blob, `HasilUjian_${examData.studentName}_Attempt${attemp}.xlsx`);
  };  

  const { pgQuestions, essayQuestions } = useMemo(() => {
    const pg = examData.questions.filter(q => q.tipe_soal !== 'esai');
    const essay = examData.questions.filter(q => q.tipe_soal === 'esai');
    return { pgQuestions: pg, essayQuestions: essay };
  }, [examData.questions]);

  const score = useMemo(() => {
    return pgQuestions.reduce((acc, q) => {
      return q.jawaban_siswa && q.jawaban_siswa.toUpperCase() === q.jawaban_benar ? acc + 1 : acc;
    }, 0);
  }, [pgQuestions]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Hasil Ujian Attempt ke-{attemp}</h1>
          <p className="text-lg text-gray-500 mt-1">
            Detail jawaban untuk <span className="font-semibold text-blue-600">{examData.studentName}</span>
          </p>
        </header>

        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <main className="lg:col-span-2 space-y-6">
              {pgQuestions.length > 0 && (
                <div className="space-y-6">
                  <h2 class="text-2xl font-bold text-gray-700">Soal Pilihan Ganda</h2>
                  {pgQuestions.map((q, index) => (
                    <QuestionCard key={q.soal_id} question={q} index={index} studentName={examData.studentName} />
                  ))}
                </div>
              )}
              {essayQuestions.length > 0 && (
                <div className="space-y-6 mt-8">
                  <h2 class="text-2xl font-bold text-gray-700">Soal Esai</h2>
                  {essayQuestions.map((q, index) => (
                    <QuestionCard key={q.soal_id} question={q} index={pgQuestions.length + index} studentName={examData.studentName} />
                  ))}
                </div>
              )}
            </main>

            <aside className="lg:col-span-1">
              <div className="sticky top-8">
                <ScoreCard score={score} totalQuestions={pgQuestions.length} studentName={examData.studentName} />
              </div>
              <button
            onClick={handleDownloadExcel}
            className="mt-4 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition"
            >
            Download Excel
            </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamResultPage;
