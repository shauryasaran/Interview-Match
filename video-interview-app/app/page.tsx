'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [company, setCompany] = useState('');
  const router = useRouter();

  const handleJoin = () => {
    if (company.trim() !== '') {
      router.push(`/room?company=${encodeURIComponent(company.trim())}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Video Interview App</h1>
      <input
        type="text"
        placeholder="Enter company name"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        className="p-3 border rounded mb-4 w-64"
      />
      <button
        onClick={handleJoin}
        className="px-6 py-2 bg-blue-600 text-white rounded"
      >
        Join Interview
      </button>
    </div>
  );
}
