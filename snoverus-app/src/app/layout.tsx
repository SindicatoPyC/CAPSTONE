import type { Metadata } from 'next';
import './globals.css';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'Sindicato - Portal Institucional',
  description: 'Plataforma integral multitenant para socios y dirigentes del sindicato',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans">
        
        {/* Navbar Institucional */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center font-black text-white shadow-md">
              ⚡
            </div>
            <span className="font-black text-white text-base tracking-tight">Sindicato PYC</span>
          </div>
        </header>

        {/* Contenido principal de las vistas */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Footer */}
        <Footer />
        
      </body>
    </html>
  );
}