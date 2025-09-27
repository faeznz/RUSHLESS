import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useParams,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import api from "./api"; 
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginPage from "./pages/Login";
import HomePage from "./pages/Home";
import CoursesPage from "./pages/Courses";
import DoExamPage from "./pages/DoExamPage";
import ExamResultPage from "./pages/ExamResultPage";
import CreateCoursesPage from "./pages/CreateCourses";
import CreateLessonCourse from "./pages/CreateLessonCourse"; // <-- Impor halaman buat course lesson
import UserManage from "./pages/UserManagementPage";
import KelasManagement from "./pages/KelasManagement";
import ManageCourse from "./pages/ManageCoursePage";
import AnalyticsCourse from "./pages/CourseAnalytics";
import AnswerSummaryPage from "./pages/AnswerSummaryPage";
import StudentLogDetailPage from "./pages/StudentLogDetailPage";
import ManageExamPage from "./pages/ManageExamPage";
import ManageGuruPage from "./pages/ManageGuruPage";
import ManageLessonPage from "./pages/ManageLessonPage"; // <-- Impor halaman kelola lesson
import ViewLessonPage from "./pages/ViewLessonPage"; // <-- Impor halaman lihat lesson
import PreviewPage from "./pages/PreviewPage";
import NotFoundPage from "./pages/NotFoundPage";
import WebSettingsPage from "./pages/WebSettingsPage";
import ProfilePage from "./pages/ProfilePage";
import LessonsPage from "./pages/LessonsPage"; // <-- Impor halaman lesson
import SetupPage from "./pages/SetupPage"; // <-- Impor halaman setup

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ExaminationPage from "./pages/exam/ExaminationPage";
import ExamMonitor from "./pages/exam/ExamMonitor";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function PublicRoute({ element }) {
  return getCookie("name") ? <Navigate to="/home" /> : element;
}

function PrivateRoute({ element }) {
  const location = useLocation();

  if (!getCookie("name")) {
    // Simpan URL tujuan sebelum login
    localStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    return <Navigate to="/" replace />;
  }

  return element;
}

function RoleRoute({ element, allowedRoles }) {
  const role = getCookie("role");
  return role && allowedRoles.includes(role) ? element : <Navigate to="/home" />;
}

function ExamResultAccessRoute({ element }) {
  const { courseId, userId } = useParams();
  const [allowed, setAllowed] = useState(null);

  const currentUserId = getCookie("user_id");
  const role = getCookie("role");

  useEffect(() => {
    const check = async () => {
      if (role === "admin" || role === "guru") {
        setAllowed(true);
        return;
      }

      if (role === "siswa" && userId !== currentUserId) {
        setAllowed(false);
        return;
      }

      try {
        const res = await api.get("/check/hasil", {
          params: {
            course_id: courseId,
            user_id: currentUserId,
          },
        });

        setAllowed(res.data?.allowed === true);
      } catch (err) {
        console.error("❌ Gagal validasi hasil:", err.message);
        setAllowed(false);
      }
    };

    check();
  }, [courseId, userId, currentUserId, role]);

  if (allowed === null) return <div>Memeriksa akses hasil...</div>;
  return allowed ? element : <Navigate to="/" />;
}

function CourseAccessRoute({ element, type = "general" }) {
  const { id } = useParams();
  const [allowed, setAllowed] = useState(null);
  const role = getCookie("role");
  const user_id = getCookie("user_id");

  useEffect(() => {
    const check = async () => {
      if (role === "admin" || role === "guru") {
        setAllowed(true);
        return;
      }

      try {
        const res = await api.get("/check/course-access", {
          params: {
            user_id,
            course_id: id,
            type,
          },
        });

        setAllowed(res.data?.allowed === true);
      } catch (err) {
        console.error("❌ Gagal validasi akses course:", err.message);
        setAllowed(false);
      }
    };

    check();
  }, [id, user_id, role, type]);

  if (allowed === null) return <div>Memeriksa akses course...</div>;
  return allowed ? element : <Navigate to="/home" />;
}

function AppLayout({ appMode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const noHeaderPaths = ["/"];
  const isDoExamPage = /^\/courses\/[^/]+\/do$/.test(location.pathname);
  const showHeader = !noHeaderPaths.includes(location.pathname) && !isDoExamPage;



  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    api.get("/web-settings").then((res) => {
      if (res.data && res.data.judul) {
        document.title = res.data.judul;
      }
    }).catch(err => {
      console.error("Failed to fetch web settings for title", err);
    });
  }, []);

  return (
    <div className="flex min-h-screen">
      {showHeader && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          appMode={appMode}
        />
      )}

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          showHeader && !isMobile && sidebarOpen ? "ml-64" : ""
        }`}
      >
        {showHeader && (
          <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        )}

        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<PublicRoute element={<LoginPage />} />} />
            <Route path="/home" element={<PrivateRoute element={<HomePage />} />} />
            <Route path="/profile" element={<PrivateRoute element={<ProfilePage />} />} />
            <Route path="/courses" element={<PrivateRoute element={<CoursesPage />} />} />
            <Route path="/lessons" element={<PrivateRoute element={<LessonsPage />} />} />
            <Route path="/courses/:id/do" element={<PrivateRoute element={<DoExamPage />} />} />
            <Route path="/courses/:id/preview" element={<PrivateRoute element={<PreviewPage />} />} />
            <Route path="/courses/:courseId/log/:userId/:attemp" element={<StudentLogDetailPage />} />

            <Route path="/exams/do" element={<PrivateRoute element={<ExaminationPage />} />} />
            <Route path="/exams/monitor" element={<PrivateRoute element={<ExamMonitor />} />} />

            <Route
              path="/courses/:courseId/:userId/:attemp/hasil"
              element={<ExamResultAccessRoute element={<ExamResultPage />} />}
            />

            <Route
              path="/courses/:id/manage"
              element={
                <RoleRoute
                  allowedRoles={["guru", "admin"]}
                  element={<CourseAccessRoute element={<ManageCourse />} type="manage" />}
                />
              }
            />
            <Route
              path="/lessons/:id/manage"
              element={
                <RoleRoute
                  allowedRoles={["guru", "admin"]}
                  element={<ManageLessonPage />} // No CourseAccessRoute needed for now
                />
              }
            />
            <Route
              path="/lessons/:id/view"
              element={<PrivateRoute element={<ViewLessonPage />} />}
            />
            <Route
              path="/examcontrol"
              element={
                <RoleRoute
                  allowedRoles={["admin"]}
                  element={<CourseAccessRoute element={<ManageExamPage />} type="control" />}
                />
              }
            />
            <Route
              path="/courses/:id/analytics"
              element={
                <RoleRoute
                  allowedRoles={["guru", "admin"]}
                  element={<CourseAccessRoute element={<AnalyticsCourse />} type="analytics" />}
                />
              }
            />

            <Route
              path="/createcourses"
              element={<RoleRoute allowedRoles={["guru", "admin"]} element={<CreateCoursesPage />} />}
            />

            <Route
              path="/create-lesson-course"
              element={<RoleRoute allowedRoles={["guru", "admin"]} element={<CreateLessonCourse />} />}
            />

            <Route
              path="/usrmng"
              element={<RoleRoute allowedRoles={["admin"]} element={<UserManage />} />}
            />
            <Route
              path="/tchmng"
              element={<RoleRoute allowedRoles={["admin"]} element={<ManageGuruPage />} />}
            />
            <Route
              path="/classmanage"
              element={<RoleRoute allowedRoles={["admin"]} element={<KelasManagement />} />}
            />
            <Route
              path="/webmng"
              element={<RoleRoute allowedRoles={["admin"]} element={<WebSettingsPage />} />}
            />
            
            <Route path="/courses/:courseId/:userId/:attemp/summary" element={<AnswerSummaryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  const [appMode, setAppMode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAppMode = async () => {
      try {
        const response = await api.get('/mode');
        if (response.data.needsSetup) {
          setAppMode('needsSetup');
        } else {
          setAppMode(response.data.mode);
        }
      } catch (error) {
        console.error("Gagal mengambil mode aplikasi:", error);
        setAppMode('error'); 
      } finally {
        setIsLoading(false);
      }
    };

    checkAppMode();
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-gray-700">Memuat Konfigurasi...</div>;
  }

  if (appMode === 'needsSetup') {
    return <SetupPage />;
  }
  
  if (appMode === 'error') {
    return <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-700">Gagal memuat konfigurasi aplikasi. Pastikan backend berjalan dan coba muat ulang halaman.</div>;
  }

  return (
    <Router>
      <AppLayout appMode={appMode} />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Router>
  );
}

export default App;
