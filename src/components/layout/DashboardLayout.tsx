import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      <Header />
      <Sidebar />
      {/*
        On mobile  : no left padding (sidebar is a drawer overlay)
        On desktop : pl-64 to offset the fixed sidebar
      */}
      <main className="pt-16 md:pl-64 transition-all duration-300">
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}