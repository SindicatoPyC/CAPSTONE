import type { Metadata } from 'next';
import './globals.css';
import Footer from '../components/Footer';
import Notificaciones from '../components/Notificaciones';

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
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans antialiased m-0 p-0 selection:bg-blue-600 selection:text-white">
        <Notificaciones />
        
        {/* Contenido principal: cada sección/layout maneja su propio Navbar multi-tenant */}
        <div className="flex-1 flex flex-col w-full m-0 p-0">
          {children}
        </div>

        {/* Footer institucional */}
        <Footer />
        
      </body>
    </html>
  );
}