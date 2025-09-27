import React from 'react';

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

const Footer = () => {
  const loggedInUser = getCookie("name");

  return (
    <footer className="bg-gray-800 text-white text-center py-4 mt-10">
      <div className="container mx-auto px-4">
        {loggedInUser && (
          <p className="text-sm mb-2">Logged in as: {loggedInUser}</p>
        )}
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Rushless Exam. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
