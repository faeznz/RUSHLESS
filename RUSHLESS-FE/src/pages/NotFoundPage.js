import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-indigo-600">404</h1>
        <p className="text-2xl md:text-3xl font-light text-gray-800 mt-4">
          Oops! The page you're looking for doesn't exist.
        </p>
        <p className="text-md text-gray-600 mt-2">
          You might have mistyped the address or the page may have moved.
        </p>
        <Link
          to="/home"
          className="mt-6 inline-block px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
