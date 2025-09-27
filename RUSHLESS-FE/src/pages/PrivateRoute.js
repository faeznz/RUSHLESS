import { useLocation, Navigate } from "react-router-dom";

function PrivateRoute({ element }) {
  const location = useLocation();

  if (!getCookie("name")) {
    if (!localStorage.getItem("redirectAfterLogin")) {
      localStorage.setItem(
        "redirectAfterLogin",
        location.pathname + location.search
      );
    }
    return <Navigate to="/" replace />;
  }

  return element;
}

export default PrivateRoute;
