import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome, FiUsers, FiBookOpen, FiX,
  FiFileText, FiSettings, FiUserCheck, FiSliders, FiBook
} from "react-icons/fi";
import api from "../api";

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function Sidebar({ isOpen, onClose, appMode }) {
  const [siteTitle, setSiteTitle] = useState("ExamApp"); // ✅ Gunakan di sini
  const role = getCookie("role");

  useEffect(() => {
    api.get("/web-settings")
      .then(res => {
        if (res.data?.judul) {
          setSiteTitle(res.data.judul);
        }
      })
      .catch(err => {
        console.warn("❌ Gagal ambil nama situs:", err);
      });
  }, []);

  const activeLinkStyle = {
    backgroundColor: "#334155",
    color: "#f8fafc",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-60 z-40 transition-opacity md:hidden ${
          isOpen ? "block" : "hidden"
        }`}
        onClick={onClose}
      ></div>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 z-50 
                   transition-transform duration-300 ease-in-out
                   ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 py-5 border-b border-slate-700">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-slate-100">{siteTitle}</h2> {/* ✅ Diganti */}
          </div>
          <button
            className="text-slate-400 text-2xl hover:text-white md:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <FiX />
          </button>
        </div>

        {/* Menu */}
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <NavLink
                to="/home"
                onClick={onClose}
                style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
              >
                <FiHome className="mr-3 text-lg" />
                <span>Beranda</span>
              </NavLink>
            </li>

            {/* ASSESSMENT & MULTI MODE */}
            {(appMode === 'assessment' || appMode === 'multi') && (
              <li>
                <NavLink
                  to="/courses"
                  onClick={onClose}
                  style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                  className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
                >
                  <FiFileText className="mr-3 text-lg" />
                  <span>Manajemen Ujian</span>
                </NavLink>
              </li>
            )}

            {/* LESSON & MULTI MODE */}
            {(appMode === 'lesson' || appMode === 'multi') && (
              <li>
                <NavLink
                  to="/lessons"
                  onClick={onClose}
                  style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                  className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
                >
                  <FiBook className="mr-3 text-lg" />
                  <span>Manajemen Lesson</span>
                </NavLink>
              </li>
            )}

            {role === "admin" && (
              <>
                <li>
                  <NavLink
                    to="/classmanage"
                    onClick={onClose}
                    style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                    className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
                  >
                    <FiBookOpen className="mr-3 text-lg" />
                    <span>Manajemen Kelas</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/usrmng"
                    onClick={onClose}
                    style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                    className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
                  >
                    <FiUsers className="mr-3 text-lg" />
                    <span>Manajemen User</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/tchmng"
                    onClick={onClose}
                    style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                    className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
                  >
                    <FiUserCheck className="mr-3 text-lg" />
                    <span>Manajemen Guru</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/webmng"
                    onClick={onClose}
                    style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                    className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
                  >
                    <FiSettings className="mr-3 text-lg" />
                    <span>Manajemen Web</span>
                  </NavLink>
                </li>
                
                {/* KONTROL UJIAN HANYA UNTUK ASSESSMENT & MULTI */}
                {(appMode === 'assessment' || appMode === 'multi') && (
                  <li>
                    <NavLink
                      to="/examcontrol"
                      onClick={onClose}
                      style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
                      className="flex items-center px-4 py-2.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors duration-200"
                    >
                      <FiSliders className="mr-3 text-lg" />
                      <span>Kontrol Ujian</span>
                    </NavLink>
                  </li>
                )}
              </>
            )}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-slate-700" />
      </aside>
    </>
  );
}

export default Sidebar;
