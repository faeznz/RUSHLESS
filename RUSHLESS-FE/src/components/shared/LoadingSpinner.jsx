import React from 'react';
import { ImSpinner2 } from 'react-icons/im';

export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-50 text-gray-600">
      <ImSpinner2 className="animate-spin text-2xl mr-3" />
      Memuat...
    </div>
  );
}