import React, { useEffect, useState, useMemo } from "react";
import api from "../api";
import Cookies from "js-cookie";
import { Link } from "react-router-dom";
import { FiBookOpen, FiCheckSquare, FiFileText, FiPlayCircle, FiArrowRight, FiActivity } from 'react-icons/fi';

const StatCard = ({ icon, title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-5">
      <div className={`rounded-full p-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
};

const ContentList = ({ title, items, type, userId }) => {
  const icon =
    type === "assessment" ? (
      <FiFileText className="text-indigo-500" />
    ) : (
      <FiPlayCircle className="text-green-500" />
    );

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              {type === "assessment" ? (
                <Link
                  to="/courses"
                  state={{ highlightedCourseId: item.id }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {icon}
                    <span className="font-medium text-gray-700">
                      {item.nama}
                    </span>
                  </div>
                  <FiArrowRight className="text-gray-400" />
                </Link>
              ) : (
                <Link
                  to={`/lessons/${item.id}/view`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {icon}
                    <span className="font-medium text-gray-700">
                      {item.nama}
                    </span>
                  </div>
                  <FiArrowRight className="text-gray-400" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <FiActivity size={32} className="mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">
            Belum ada {type === "assessment" ? "ujian" : "materi"} yang
            tersedia.
          </p>
        </div>
      )}
      {items.length > 5 && (
        <Link
          to={type === "assessment" ? "/courses" : "/lessons"}
          className="block text-center mt-4 text-indigo-600 font-semibold hover:underline"
        >
          Lihat Semua
        </Link>
      )}
    </div>
  );
};

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 animate-pulse">
    <div className="max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="h-8 bg-gray-200 rounded-md w-1/3 mb-2"></div>
      <div className="h-5 bg-gray-200 rounded-md w-1/2 mb-8"></div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        <div className="h-24 bg-gray-200 rounded-xl"></div>
        <div className="h-24 bg-gray-200 rounded-xl"></div>
      </div>

      {/* Content Lists Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <div className="h-48 bg-gray-200 rounded-xl"></div>
        <div className="h-48 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  </div>
);

function HomePage() {
  const [user, setUser] = useState({});
  const [assessments, setAssessments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [stats, setStats] = useState({ completed: 0 });
  const [loading, setLoading] = useState(true);

  const userId = Cookies.get("user_id");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, statsRes, allCourseRes] = await Promise.all([
          api.get("/user", { params: { id: userId } }),
          api.get("/dashboard/summary", { params: { user_id: userId } }),
          api.get("/courses")
        ]);

        setUser(userRes.data);
        setStats(statsRes.data);

        const allCourses = allCourseRes.data || [];
        const assessmentCourses = allCourses.filter(course => course.waktu !== null && course.waktu > 0);
        const lessonCourses = allCourses.filter(course => course.waktu === null || course.waktu === 0);

        setAssessments(assessmentCourses);
        setLessons(lessonCourses);

      } catch (error) {
        console.error("❌ Gagal load data dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Selamat Datang, {user.name}!
          </h1>
          <p className="mt-1 text-md text-gray-600">
            Berikut adalah ringkasan aktivitas dan progres belajar Anda.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={<FiFileText size={22} />}
            title="Ujian Tersedia"
            value={assessments.length}
            color="blue"
          />
          <StatCard
            icon={<FiBookOpen size={22} />}
            title="Materi Tersedia"
            value={lessons.length}
            color="purple"
          />
          <StatCard
            icon={<FiCheckSquare size={22} />}
            title="Ujian Selesai"
            value={stats.completed}
            color="green"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <ContentList title="Ujian Terbaru" items={assessments} type="assessment" userId={userId} />
          <ContentList title="Materi Terbaru" items={lessons} type="lesson" />
        </div>
      </div>
    </div>
  );
}

export default HomePage;
