import React, { useEffect } from 'react';
import ExamHeader from './ExamHeader';
import ExamQuestion from './ExamQuestion';
import ExamSidebar from './ExamSidebar';
import useExamStore from '../../stores/useExamStore';
import useUIStore from '../../stores/useUIStore';
import useAuthStore from '../../stores/useAuthStore';

export default function ExamLayout() {
  const { fetchSoal } = useExamStore();
  const { user } = useAuthStore();
  const { showSidebar, setShowSidebar } = useUIStore(); // ambil setter

  const courseId = window.location.pathname.split('/')[2];

  useEffect(() => {
    if (user?.id) fetchSoal(courseId, user.id);
  }, [user, courseId]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-4 overflow-y-auto">
          <ExamQuestion />
        </main>

        {/* Sidebar versi desktop */}
        <aside className="hidden md:block w-80 bg-white border-l p-4">
          <ExamSidebar />
        </aside>

        {/* Sidebar versi mobile */}
        {showSidebar && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-end md:hidden">
            <div className="w-80 bg-white p-4 h-full overflow-y-auto">
              {/* Tombol tutup di dalam sidebar */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowSidebar(false)}
                  className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300"
                >
                  ✖ Tutup
                </button>
              </div>
              <ExamSidebar />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
