import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f9fafb] flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden ml-72">
        {/* Navbar */}
        <Navbar />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10 pt-28 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
