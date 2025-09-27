// src/hooks/useQueryParams.js
import { useSearchParams } from 'react-router-dom';
import { useLocation } from "react-router-dom";

function parseJwt(token) {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function useQueryParams() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const payload = parseJwt(token);
  const location = useLocation();
  const { courseId, userId } = location.state || {};

  return {
    courseId,
    token,
    userId
  };
}