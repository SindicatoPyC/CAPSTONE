'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '../../components/Navbar'; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminArea = pathname?.startsWith('/dashboard/admin');

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {!isAdminArea && <Navbar />}
      
      {/* Eliminamos márgenes o paddings parásitos para que el hero pegue al ras del navbar */}
      <main className="flex-grow w-full m-0 p-0">
        {children}
      </main>
    </div>
  );
}