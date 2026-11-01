'use client';

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../app/lib/supabase";
import Campanita from "./Campanita";

// ─── Colores por rol ───────────────────────────────────────────────────────────
const ROL_COLORS: Record<string, { text: string; border: string; bg: string; glow: string }> = {
  superadmin:    { text: 'text-purple-400',  border: 'border-purple-400',  bg: 'bg-purple-500/10',  glow: 'shadow-[0_0_0_1px_rgba(168,85,247,0.4)]' },
  admin:         { text: 'text-yellow-400',  border: 'border-yellow-400',  bg: 'bg-yellow-500/10',  glow: 'shadow-[0_0_0_1px_rgba(234,179,8,0.4)]'  },
  administrador: { text: 'text-yellow-400',  border: 'border-yellow-400',  bg: 'bg-yellow-500/10',  glow: 'shadow-[0_0_0_1px_rgba(234,179,8,0.4)]'  },
  socio:         { text: 'text-green-400',   border: 'border-green-400',   bg: 'bg-green-500/10',   glow: 'shadow-[0_0_0_1px_rgba(34,197,94,0.4)]'  },
};

function getRolColor(rol: string) {
  return ROL_COLORS[rol] ?? ROL_COLORS['socio'];
}

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState("Cargando...");
  const [userRole, setUserRole] = useState("socio");

  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenantName, setTenantName] = useState("Sindicato PYC");
  const [tenantLogo, setTenantLogo] = useState("/logopyf.jpeg");

  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editTenantName, setEditTenantName] = useState("");
  const [editTenantLogo, setEditTenantLogo] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingTenant, setSavingTenant] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [sindicatos, setSindicatos] = useState<any[]>([]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const getRoleNameUI = (rol: string | null | undefined) => {
    const r = String(rol || '').toLowerCase();
    if (r === 'superadmin') return 'Admin';
    if (r === 'admin' || r === 'administrador') return 'Presidente';
    return 'Socio';
  };

  useEffect(() => {
    let channel: any;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    const fetchUserData = async () => {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`full_name, role, email, sindicatos (id, nombre, logo_url)`)
        .eq('id', user.id)
        .single();

      if (!profileError && profile) {
        setUserName(profile.full_name || profile.email?.split('@')[0] || "Usuario");
        const rolActual = String(profile.role || '').trim().toLowerCase();
        setUserRole(rolActual);

        let activeSindicato = profile.sindicatos ? (Array.isArray(profile.sindicatos) ? profile.sindicatos[0] : profile.sindicatos) : null;

        if (rolActual === 'superadmin') {
          const { data: allSindicatos } = await supabase.from('sindicatos').select('*');
          if (allSindicatos) setSindicatos(allSindicatos);

          const cachedTenantId = localStorage.getItem('sindicato_activo');
          if (cachedTenantId && allSindicatos) {
             const found = allSindicatos.find(s => String(s.id) === String(cachedTenantId));
             if (found) activeSindicato = found;
          }
        } else {
          if (activeSindicato) localStorage.setItem('sindicato_activo', activeSindicato.id);
        }

        if (activeSindicato) {
          setTenantId(activeSindicato.id);
          setTenantName(activeSindicato.nombre || "Organización Activa");
          setTenantLogo(activeSindicato.logo_url || "/logopyf.jpeg");
          setEditTenantName(activeSindicato.nombre || "Organización Activa");
          setEditTenantLogo(activeSindicato.logo_url || "");

          const channelName = `tenant-ui-${activeSindicato.id}-${Date.now()}`;
          channel = supabase.channel(channelName)
            .on('postgres_changes', {
              event: 'UPDATE', schema: 'public', table: 'sindicatos', filter: `id=eq.${activeSindicato.id}`
            }, (payload) => {
              setTenantName(payload.new.nombre);
              setTenantLogo(payload.new.logo_url || '/logopyf.jpeg');
              setEditTenantName(payload.new.nombre);
              setEditTenantLogo(payload.new.logo_url || '');
            }).subscribe();
        }
      }
    };

    fetchUserData();
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (channel) createClient().removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {}
    document.cookie = 'sb-sindicato-session=; path=/; max-age=0;';
    document.cookie = 'sb-sindicato-rol=; path=/; max-age=0;';
    router.push('/');
    router.refresh();
  };

  const seleccionarSindicato = (sindicato: any) => {
    localStorage.setItem('sindicato_activo', sindicato.id);
    setMenuOpen(false);
    window.location.reload();
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setSavingTenant(true);
    try {
      const supabase = createClient();
      let finalLogoUrl = editTenantLogo;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo_${tenantId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
        finalLogoUrl = data.publicUrl;
      }

      await supabase.from('sindicatos').update({ nombre: editTenantName, logo_url: finalLogoUrl.trim() !== '' ? finalLogoUrl.trim() : '/logopyf.jpeg' }).eq('id', tenantId);
      setShowTenantModal(false);
      setLogoFile(null);
    } catch (err: any) { alert("Error al actualizar: " + err.message); } finally { setSavingTenant(false); }
  };

  const getInitials = (name: string) => {
    if (!name || name === "Cargando...") return '..';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const iniciales = getInitials(userName);
  const isAdminOrSuper = userRole === 'superadmin' || userRole === 'admin' || userRole === 'administrador';
  const rolColor = getRolColor(userRole);

  return (
    <>
      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-[100] transition-all duration-300 bg-[#070709] border-b border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-[76px]">

            {/* 1. LADO IZQUIERDO: LOGO */}
            <div className="flex-shrink-0 flex items-center w-auto lg:w-1/4">
              {userRole === 'superadmin' ? (
                <div className="relative" ref={menuRef}>
                  <button onClick={() => setMenuOpen(!menuOpen)} className="group flex items-center gap-3 text-left focus:outline-none p-1.5 rounded-2xl hover:bg-white/5 transition-all">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-black border border-white/10 p-0.5 shadow-md transition-transform group-hover:scale-105">
                      <img src={tenantLogo} alt={tenantName} className="h-full w-full object-cover rounded-lg" onError={(e) => { e.currentTarget.src = '/logopyf.jpeg' }} />
                    </div>
                    <div className="hidden sm:flex flex-col justify-center">
                      <span className="font-bold text-[15px] tracking-tight text-white flex items-center gap-1.5 transition-colors group-hover:text-purple-400">
                        {tenantName}
                        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                      </span>
                    </div>
                  </button>

                  {menuOpen && (
                    <div className="absolute left-0 mt-2 w-[300px] bg-[#121216] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar p-1">
                        {sindicatos.map(s => (
                          <button key={s.id} onClick={() => seleccionarSindicato(s)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${tenantId === s.id ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                            <span className="truncate pr-2">{s.nombre}</span>
                          </button>
                        ))}
                      </div>
                      <div className="border-t border-white/10 mt-2 pt-2 px-1">
                        <button onClick={() => { setMenuOpen(false); setShowTenantModal(true); }} className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors flex items-center gap-2">
                          ✏️ Modificar Identidad
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : isAdminOrSuper ? (
                <button onClick={() => setShowTenantModal(true)} className="group flex items-center gap-3 p-1.5 rounded-2xl hover:bg-white/5 transition-all focus:outline-none">
                  <div className="h-10 w-10 rounded-xl overflow-hidden border border-white/10 bg-black p-0.5 shadow-md relative transition-transform group-hover:scale-105">
                    <img src={tenantLogo} alt={tenantName} className="h-full w-full object-cover rounded-lg" />
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <span className="text-white text-xs">✏️</span>
                    </div>
                  </div>
                  <span className="font-bold text-[15px] tracking-tight text-white hidden sm:block group-hover:text-yellow-400 transition-colors">{tenantName}</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 pl-2">
                  <div className="h-10 w-10 rounded-xl overflow-hidden border border-white/10 bg-black p-0.5 shadow-md">
                    <img src={tenantLogo} alt={tenantName} className="h-full w-full object-cover rounded-lg" />
                  </div>
                  <Link href="/dashboard" className="font-bold text-[15px] tracking-tight text-white hidden sm:block hover:text-green-400 transition-colors">{tenantName}</Link>
                </div>
              )}
            </div>

            {/* 2. CENTRO: NAVEGACIÓN */}
            <div className="hidden lg:flex flex-1 items-center justify-center gap-1">
              <Link href="/dashboard" className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all">Inicio</Link>
              <Link href="/dashboard/beneficios" className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all">Beneficios</Link>
              <Link href="/dashboard/chat-legal" className="px-5 py-2.5 rounded-xl text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all flex items-center gap-2">
                🤖 Legal AI
              </Link>

              {/* MEGAMENÚ */}
              <div className="relative group flex items-center h-[76px]">
                <button className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 group-hover:text-white group-hover:bg-white/5 transition-all outline-none">
                  Módulos
                  <svg className="w-3.5 h-3.5 opacity-70 group-hover:rotate-180 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                </button>

                <div className="absolute top-[76px] left-1/2 -translate-x-1/2 w-[480px] bg-[#121216] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-50 overflow-hidden">
                  <div className="p-3 grid grid-cols-2 gap-1.5">
                    <Link href="/dashboard/credencial" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">🪪</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Credencial</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">ID del Sindicato</p></div>
                    </Link>
                    <Link href="/dashboard/asistencia" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">📅</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Asistencia</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">Registro y Escáner</p></div>
                    </Link>
                    <Link href="/dashboard/actas" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">📜</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Actas</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">Documentos oficiales</p></div>
                    </Link>
                    <Link href="/dashboard/finanzas" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">💰</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Finanzas</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">Transparencia</p></div>
                    </Link>
                    <Link href="/dashboard/encuestas" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">📊</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Votaciones</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">Participación activa</p></div>
                    </Link>
                    <Link href="/dashboard/negociacion" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">🤝</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Negociación</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">Contratos colectivos</p></div>
                    </Link>
                    <Link href="/dashboard/solidario" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">🫂</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Solidario</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">Aportes y ayudas</p></div>
                    </Link>
                    <Link href="/dashboard/soporte" className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/5">
                      <span className="text-xl group-hover/item:scale-110 transition-transform">🎧</span>
                      <div><h4 className="text-sm font-semibold text-white mb-0.5">Soporte</h4><p className="text-[10px] text-slate-400 font-medium leading-tight">Mesa de ayuda</p></div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. LADO DERECHO: PERFIL Y ADMIN */}
            <div className="flex items-center justify-end gap-5 w-auto lg:w-1/4">

              <div className="hidden xl:flex items-center">
                {userRole === 'superadmin' && (
                  <Link href="/superadmin" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-white transition-colors mr-6">SaaS</Link>
                )}
                {isAdminOrSuper && (
                  <Link href="/dashboard/admin" className="text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all border border-white/10 shadow-sm">
                    ⚙️ Panel Admin
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Campanita />

                {/* PERFIL CON COLOR POR ROL */}
                <div className="hidden sm:flex items-center gap-3 cursor-pointer group" onClick={() => router.push('/dashboard/perfil')}>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-white group-hover:text-white/80 transition-colors leading-tight">{userName}</span>
                    {/* Badge de rol con color */}
                    <span className={`text-[9px] font-bold tracking-widest uppercase ${rolColor.text}`}>
                      {getRoleNameUI(userRole)}
                    </span>
                  </div>

                  {/* Avatar con borde y glow según rol */}
                  <div className={`h-9 w-9 rounded-xl bg-black border flex items-center justify-center text-xs font-bold text-white transition-all ${rolColor.border} ${rolColor.glow}`}>
                    {iniciales}
                  </div>
                </div>

                <button onClick={handleLogout} className="hidden sm:block text-slate-400 hover:text-red-400 transition-colors p-1" title="Cerrar Sesión">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>

                {/* HAMBURGUESA MÓVIL */}
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden text-slate-300 hover:text-white transition-colors p-2 rounded-xl bg-white/5 active:scale-95">
                  {isMobileMenuOpen
                    ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                  }
                </button>
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* Espaciado para compensar navbar fija */}
      <div className="h-[76px] hidden lg:block bg-transparent pointer-events-none"></div>

      {/* MENÚ MÓVIL con indicador de rol */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[76px] z-[90] bg-[#070709] flex flex-col overflow-y-auto animate-in fade-in duration-200">

          {/* Cabecera con nombre y rol en móvil */}
          <div className={`mx-6 mt-6 mb-2 p-4 rounded-2xl border ${rolColor.border} ${rolColor.bg} flex items-center gap-3`}>
            <div className={`h-10 w-10 rounded-xl bg-black border flex items-center justify-center text-sm font-bold text-white ${rolColor.border} ${rolColor.glow}`}>
              {iniciales}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{userName}</p>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${rolColor.text}`}>{getRoleNameUI(userRole)}</p>
            </div>
          </div>

          <div className="flex flex-col px-6 py-4 space-y-3 pb-32">
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard" className="text-base font-semibold text-white p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">🏠 Inicio</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard/credencial" className="text-base font-semibold text-white p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">🪪 Mi Credencial Digital</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard/asistencia" className="text-base font-semibold text-white p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">📅 Escáner de Asistencia</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard/beneficios" className="text-base font-semibold text-white p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">🎁 Beneficios</Link>
            <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard/chat-legal" className="text-base font-semibold text-blue-300 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">🤖 Asistente Legal AI</Link>

            <div className="my-2 border-t border-white/10"></div>

            {isAdminOrSuper && (
              <Link onClick={() => setIsMobileMenuOpen(false)} href="/dashboard/admin" className="text-sm font-semibold text-white p-4 rounded-xl bg-white/10 border border-white/10 flex justify-center hover:bg-white/15 transition-all">
                ⚙️ Panel Administrativo
              </Link>
            )}

            <button onClick={handleLogout} className="text-sm font-semibold text-red-400 p-4 rounded-xl bg-red-500/10 border border-red-500/20 transition-colors flex justify-center">
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      )}

      {/* Modal Edición Sindicato */}
      {showTenantModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowTenantModal(false)}>
          <div className="bg-[#121216] rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Identidad Visual</h3>
              <button onClick={() => {setShowTenantModal(false); setLogoFile(null);}} className="text-slate-400 hover:text-white transition-colors bg-white/5 h-8 w-8 rounded-xl flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={handleSaveTenant} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Nombre Oficial</label>
                <input type="text" value={editTenantName} onChange={(e) => setEditTenantName(e.target.value)} required className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Logo / Emblema</label>
                <input type="file" accept="image/*" onChange={(e) => { setLogoFile(e.target.files ? e.target.files[0] : null); if (e.target.files && e.target.files.length > 0) setEditTenantLogo(""); }} className="w-full text-xs font-medium text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer transition-colors" />
                <div className="flex items-center gap-3 my-3">
                  <div className="h-px bg-white/10 flex-1"></div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">O Enlace Web</span>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>
                <input type="url" value={editTenantLogo} onChange={(e) => { setEditTenantLogo(e.target.value); setLogoFile(null); }} placeholder="https://..." className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => {setShowTenantModal(false); setLogoFile(null);}} className="flex-1 bg-white/5 text-slate-300 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingTenant} className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-blue-500 transition-colors shadow-md">{savingTenant ? 'Guardando...' : 'Aplicar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
