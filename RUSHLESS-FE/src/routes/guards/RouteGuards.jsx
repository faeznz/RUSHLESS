// src/routes/guards/RouteGuards.jsx
import { Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export function PublicRoute({ element }) {
  return getCookie("name") ? <Navigate to="/home" /> : element;
}

export function PrivateRoute({ element }) {
  const location = useLocation();
  if (!getCookie("name")) {
    localStorage.setItem("redirectAfterLogin", location.pathname + location.search);
    return <Navigate to="/" replace />;
  }
  return element;
}

export function RoleRoute({ element, allowedRoles }) {
  const role = getCookie("role");
  return role && allowedRoles.includes(role) ? element : <Navigate to="/home" />;
}

export function ExamResultAccessRoute({ element }) {
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
          params: { course_id: courseId, user_id: currentUserId },
        });
        setAllowed(res.data?.allowed === true);
      } catch {
        setAllowed(false);
      }
    };
    check();
  }, [courseId, userId, currentUserId, role]);

  if (allowed === null) return <div>Memeriksa akses hasil...</div>;
  return allowed ? element : <Navigate to="/" />;
}

export function CourseAccessRoute({ element, type = "general" }) {
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
          params: { user_id, course_id: id, type },
        });
        setAllowed(res.data?.allowed === true);
      } catch {
        setAllowed(false);
      }
    };
    check();
  }, [id, user_id, role, type]);

  if (allowed === null) return <div>Memeriksa akses course...</div>;
  return allowed ? element : <Navigate to="/home" />;
}
