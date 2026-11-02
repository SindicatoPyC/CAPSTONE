import type { Metadata } from 'next';
import './globals.css';
import Footer from '../components/Footer';
import { createClient } from '../lib/supabase';

export const metadata: Metadata = {
  title: 'Sindicato - Portal Institucional',
  description: 'Plataforma integral multitenant para socios y dirigentes del sindicato',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  
  // Obtenemos la sesión del usuario actual de forma segura en el servidor
  const { data: { user } } = await supabase.auth.getUser();

  let sindicatoInfo = {
    nombre: 'Sindicato PYC',
    logo_url: '',
    direccion: 'Dirección no registrada',
    telefono: 'Teléfono no registrado',
    email: 'contacto@sindicato.cl'
  };

  if (user) {
    // Consultamos el padrón / perfil del usuario para conocer su sindicato asignado
    const { data: profile } = await supabase
      .from('profiles')
      .select('sindicato_id')
      .eq('id', user.id)
      .single();

    if (profile?.sindicato_id) {
      // Obtenemos los datos institucionales específicos de ese sindicato (Multi-tenant)
      const { data: sindicato } = await supabase
        .from('sindicatos')
        .select('*')
        .eq('id', profile.sindicato_id)
        .single();

      if (sindicato) {
        sindicatoInfo = {
          nombre: sindicato.nombre || sindicatoInfo.nombre,
          logo_url: sindicato.logo_url || '',
          direccion: sindicato.direccion || sindicatoInfo.direccion,
          telefono: sindicato.telefono || sindicatoInfo.telefono,
          email: sindicato.email || sindicatoInfo.email
        };
      }
    }
  }

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
        
        {/* Navbar Dinámico Multitenant */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-6 py-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <div className="flex items-center gap-3">
            {sindicatoInfo.logo_url ? (
              <img 
                src={sindicatoInfo.logo_url} 
                alt="Logo Sindicato" 
                className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-md" 
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center font-black text-white shadow-md">
                ⚡
              </div>
            )}
            <span className="font-black text-white text-base tracking-tight">{sindicatoInfo.nombre}</span>
          </div>
        </header>

        {/* Contenido principal de las vistas */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>

        {/* Footer Dinámico con la información del Sindicato correspondiente */}
        <Footer sindicato={sindicatoInfo} />
        
      </body>
    </html>
  );
}