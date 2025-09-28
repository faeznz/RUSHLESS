// src/layout/AppLayout.jsx
import { useEffect, useState } from "react";
import { useLocation, Routes, Route } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import api from "../api";
import AppRoutes from "./AppRoutes";

export default function AppLayout({ appMode }) {
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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    api.get("/web-settings").then((res) => {
      if (res.data?.judul) document.title = res.data.judul;
    }).catch(() => {});
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
          <AppRoutes /> {/* Semua route pindah ke sini */}
        </main>
        <Footer />
      </div>
    </div>
  );
}
