import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { toast } from '../utils/toast';
import { FiChevronLeft, FiChevronRight, FiCheckCircle, FiPlayCircle, FiLoader, FiBook } from 'react-icons/fi';
import DOMPurify from 'dompurify';

// --- KOMPONEN BARU: Skeleton Loader untuk tampilan LMS ---
const ViewLessonSkeleton = () => (
  <div className="flex h-screen bg-slate-50 font-sans animate-pulse">
    {/* Sidebar Skeleton */}
    <div className="hidden md:flex flex-col w-1/3 lg:w-1/4 border-r border-slate-200 bg-white p-4">
      <div className="h-5 w-3/4 bg-slate-200 rounded-md mb-2"></div>
      <div className="h-3 w-1/2 bg-slate-200 rounded-md mb-4"></div>
      <div className="h-2 w-full bg-slate-200 rounded-full mb-6"></div>
      <div className="space-y-3">
        <div className="h-10 w-full bg-slate-200 rounded-lg"></div>
        <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
        <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
        <div className="h-10 w-full bg-slate-100 rounded-lg"></div>
      </div>
    </div>
    {/* Content Skeleton */}
    <div className="w-full md:w-2/3 lg:w-3/4 p-8 overflow-y-auto">
      <div className="h-8 w-1/2 bg-slate-300 rounded-md mb-6"></div>
      <div className="space-y-4">
        <div className="h-4 w-full bg-slate-200 rounded-md"></div>
        <div className="h-4 w-5/6 bg-slate-200 rounded-md"></div>
        <div className="h-4 w-full bg-slate-200 rounded-md"></div>
        <div className="h-4 w-3/4 bg-slate-200 rounded-md"></div>
      </div>
    </div>
  </div>
);

const ViewLessonPage = () => {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State baru untuk UI LMS
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  useEffect(() => {
    const fetchCourseAndLessons = async () => {
      setLoading(true);
      try {
        const courseRes = await api.get(`/courses/${courseId}`);
        setCourse(courseRes.data);

        const lessonsRes = await api.get(`/lessons/course/${courseId}`);
        const sortedLessons = lessonsRes.data.sort((a, b) => a.order - b.order);
        setLessons(sortedLessons);

        if (sortedLessons.length > 0) {
          setActiveLessonId(sortedLessons[0].id);
        }
      } catch (error) {
        console.error("Gagal mengambil materi:", error);
        toast.error("Materi tidak ditemukan atau gagal dimuat.");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseAndLessons();
  }, [courseId, navigate]);

  const activeLesson = useMemo(() => {
    return lessons.find(lesson => lesson.id === activeLessonId);
  }, [activeLessonId, lessons]);

  const activeLessonIndex = useMemo(() => {
    return lessons.findIndex(lesson => lesson.id === activeLessonId);
  }, [activeLessonId, lessons]);

  const handleNavigate = (direction) => {
    const newIndex = direction === 'next' ? activeLessonIndex + 1 : activeLessonIndex - 1;
    if (newIndex >= 0 && newIndex < lessons.length) {
      setActiveLessonId(lessons[newIndex].id);
    }
  };

  const handleCompleteAndNext = () => {
    setCompletedLessons(prev => new Set(prev).add(activeLessonId));
    handleNavigate('next');
  };

  const progress = lessons.length > 0 ? (completedLessons.size / lessons.length) * 100 : 0;

  if (loading) {
    return <ViewLessonSkeleton />;
  }

  if (!course || lessons.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-slate-50 text-center p-4">
        <FiBook className="text-6xl text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Materi Belum Tersedia</h2>
        <p className="text-slate-500 max-w-sm mt-2">
          {course ? `Belum ada materi yang ditambahkan untuk course "${course.nama}".` : "Course ini tidak dapat ditemukan."}
        </p>
        <button onClick={() => navigate('/lessons')} className="mt-6 flex items-center gap-2 text-indigo-600 font-semibold hover:underline">
          <FiChevronLeft /> Kembali ke Daftar Materi
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar Navigasi Materi */}
      <aside className="hidden md:flex flex-col w-1/3 lg:w-1/4 h-full bg-white border-r border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <button onClick={() => navigate('/lessons')} className="flex items-center gap-1 text-sm text-indigo-600 font-semibold mb-2 hover:underline">
            <FiChevronLeft size={14} /> Kembali
          </button>
          <h1 className="text-lg font-bold text-slate-800 truncate">{course.nama}</h1>
          
          <div className="mt-3">
             <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto">
          <ul className="p-2">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === activeLessonId;
              const isCompleted = completedLessons.has(lesson.id);
              return (
                <li key={lesson.id}>
                  <button
                    onClick={() => setActiveLessonId(lesson.id)}
                    className={`w-full text-left p-3 my-1 rounded-lg flex items-center gap-3 transition-colors duration-200 ${
                      isActive ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isCompleted ? <FiCheckCircle className="text-green-500 flex-shrink-0"/> : isActive ? <FiPlayCircle className="text-indigo-500 flex-shrink-0"/> : <span className="w-5 h-5 border-2 border-slate-300 rounded-full"></span>}
                    <span className="truncate">{index + 1}. {lesson.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Area Konten Materi */}
      <main className="w-full md:w-2/3 lg:w-3/4 h-full flex flex-col">
        <div className="flex-1 p-6 sm:p-8 lg:p-12 overflow-y-auto">
          {activeLesson ? (
            <article>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">{activeLesson.title}</h2>
              <div
                className="prose prose-slate lg:prose-lg max-w-none prose-img:rounded-lg prose-img:shadow-md"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(activeLesson.content) }}
              />
            </article>
          ) : (
             <div className="text-center py-10">
                <p className="text-slate-600">Pilih materi dari daftar di samping untuk memulai.</p>
            </div>
          )}
        </div>
        
        {/* Footer Navigasi Konten */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center">
          <button
            onClick={() => handleNavigate('prev')}
            disabled={activeLessonIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <FiChevronLeft /> Materi Sebelumnya
          </button>
          <button
            onClick={handleCompleteAndNext}
            disabled={activeLessonIndex === lessons.length - 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
          >
            {completedLessons.has(activeLessonId) ? 'Lanjut ke Materi Berikutnya' : 'Selesai & Lanjutkan'}
            <FiChevronRight />
          </button>
        </div>
      </main>
    </div>
  );
};

export default ViewLessonPage;