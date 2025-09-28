// src/routes/AppRoutes.jsx
import { Routes, Route } from "react-router-dom";
import {
  PrivateRoute,
  PublicRoute,
  RoleRoute,
  ExamResultAccessRoute,
  CourseAccessRoute,
} from "./guards/RouteGuards";

import LoginPage from "../pages/Login";
import HomePage from "../pages/Home";
import CoursesPage from "../pages/Courses";
import DoExamPage from "../pages/DoExamPage";
import ExamResultPage from "../pages/ExamResultPage";
import CreateCoursesPage from "../pages/CreateCourses";
import CreateLessonCourse from "../pages/CreateLessonCourse";
import UserManage from "../pages/UserManagementPage";
import KelasManagement from "../pages/KelasManagement";
import ManageCourse from "../pages/ManageCoursePage";
import AnalyticsCourse from "../pages/CourseAnalytics";
import AnswerSummaryPage from "../pages/AnswerSummaryPage";
import StudentLogDetailPage from "../pages/StudentLogDetailPage";
import ManageExamPage from "../pages/ManageExamPage";
import ManageGuruPage from "../pages/ManageGuruPage";
import ManageLessonPage from "../pages/ManageLessonPage";
import ViewLessonPage from "../pages/ViewLessonPage";
import PreviewPage from "../pages/PreviewPage";
import NotFoundPage from "../pages/NotFoundPage";
import WebSettingsPage from "../pages/WebSettingsPage";
import ProfilePage from "../pages/ProfilePage";
import LessonsPage from "../pages/LessonsPage";
import SetupPage from "../pages/SetupPage";
import ExaminationPage from "../pages/exam/ExaminationPage";
import ExamMonitor from "../pages/exam/ExamMonitor";

export default function AppRoutes() {
  return (
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
            element={<ManageLessonPage />}
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
  );
}
