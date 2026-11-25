'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '../app/lib/supabase';

const BRAND_NAME = 'Snoverus';
const BRAND_LEGAL = 'Snoverus Technologies SpA';

type LegalTab = 'terminos' | 'privacidad' | null;

function SnoverusMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <linearGradient id="snvFooterGold" x1="2" y1="2" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f3c64f" />
          <stop offset="1" stopColor="#c9940a" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="9" fill="url(#snvFooterGold)" />
      <path
        d="M23.5 12.2C22.4 10.9 20.5 10.2 18.2 10.2C14.7 10.2 12.5 11.9 12.5 14.3C12.5 16.9 14.9 17.8 18.4 18.6C21.3 19.3 22.8 20.1 22.8 21.8C22.8 23.4 21.1 24.5 18.4 24.5C16.1 24.5 14.2 23.7 13 22.3"
        stroke="#0b0d12"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="25.5" cy="11.5" r="2" fill="#0b0d12" />
    </svg>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SN';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Footer() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const isDashboard = pathname?.startsWith('/dashboard');

  const [tenantName, setTenantName] = useState<string>('');
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [legalModal, setLegalModal] = useState<LegalTab>(null);

  useEffect(() => {
    if (isLanding || !isDashboard) return;

    let channel: any = null;
    let active = true;
    const supabase = createClient();

    const fetchTenantData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !active) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, sindicato_id')
          .eq('id', user.id)
          .maybeSingle();

        let targetId: number | null = profile?.sindicato_id ? Number(profile.sindicato_id) : null;
        const rol = String(profile?.role || '').trim().toLowerCase();

        if (rol === 'superadmin') {
          const cached = localStorage.getItem('sindicato_activo');
          if (cached && !Number.isNaN(Number(cached))) {
            targetId = Number(cached);
          }
        }

        if (!targetId || !active) return;

        const { data: sindicato } = await supabase
          .from('sindicatos')
          .select('id, nombre, logo_url')
          .eq('id', targetId)
          .maybeSingle();

        if (sindicato && active) {
          setTenantId(sindicato.id);
          setTenantName(sindicato.nombre || 'Organización Sindical');
          setTenantLogo(sindicato.logo_url || null);
          setLogoError(false);

          const channelName = `footer-tenant-${sindicato.id}-${Date.now()}`;
          channel = supabase
            .channel(channelName)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'sindicatos',
                filter: `id=eq.${sindicato.id}`,
              },
              (payload: any) => {
                if (!active) return;
                if (payload?.new?.nombre) setTenantName(payload.new.nombre);
                setTenantLogo(payload?.new?.logo_url || null);
                setLogoError(false);
              }
            )
            .subscribe();
        }
      } catch {
        // Silencioso para no ensuciar consola si no hay sesión activa
      }
    };

    fetchTenantData();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isLanding, isDashboard, pathname]);

  // En la Landing (/) ya existe el footer corporativo completo de Snoverus con Cookies y Legal
  if (isLanding) return null;

  const year = new Date().getFullYear();

  return (
    <>
      {isDashboard ? (
        /* ================= FOOTER MULTI-TENANT DENTRO DEL DASHBOARD ================= */
        <footer className="bg-[#090b10] border-t border-white/[0.07] text-slate-400 mt-auto relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6 lg:px-10 py-11 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-9">
            {/* Identidad Dinámica del Sindicato */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-3.5">
                {tenantLogo && !logoError ? (
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 bg-[#111520] flex items-center justify-center shrink-0">
                    <img
                      src={tenantLogo}
                      alt={`Logo ${tenantName || 'Sindicato'}`}
                      className="w-full h-full object-cover"
                      onError={() => setLogoError(true)}
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-[#e5b32a]/15 border border-[#e5b32a]/35 text-[#e5b32a] font-bold text-sm flex items-center justify-center shrink-0">
                    {tenantName ? getInitials(tenantName) : <SnoverusMark size={24} />}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold text-base tracking-tight truncate">
                      {tenantName || 'Portal Sindical'}
                    </h3>
                    {tenantId && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#e5b32a]/10 border border-[#e5b32a]/30 text-[#e5b32a] shrink-0">
                        #{tenantId}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mt-0.5">
                    Instancia verificada · {BRAND_NAME}®
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Espacio digital independiente para la gestión transparente de beneficios, asambleas,
                actas y representación colectiva de los trabajadores afiliados.
              </p>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.07] text-[11px] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Aislamiento multi-tenant activo (RLS)</span>
              </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Navegación
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/dashboard" className="hover:text-[#e5b32a] transition-colors">
                    Inicio del Portal
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/beneficios" className="hover:text-[#e5b32a] transition-colors">
                    Catálogo de Beneficios
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/chat-legal" className="hover:text-[#e5b32a] transition-colors">
                    Asistente Legal IA
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/actas" className="hover:text-[#e5b32a] transition-colors">
                    Transparencia y Actas
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/soporte" className="hover:text-[#e5b32a] transition-colors">
                    Mesa de Soporte
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contacto Institucional */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Contacto y Sede
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-[#e5b32a] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z" />
                    <circle cx="12" cy="11" r="2.2" />
                  </svg>
                  <span>Av. Pajaritos 1234, Of. 502, Maipú, Santiago, Chile.</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-[#e5b32a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.1 3.3a1 1 0 01-.24 1.02L7.7 9.4a11.05 11.05 0 006.9 6.9l1.4-1.39a1 1 0 011.02-.24l3.3 1.1a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                  </svg>
                  <span className="font-mono">+56 2 2345 6789</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-[#e5b32a] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:soporte@snoverus.cl" className="hover:text-white transition-colors">
                    soporte@snoverus.cl
                  </a>
                </li>
              </ul>
            </div>

            {/* Ubicación con estilo integrado */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Ubicación
              </h4>
              <div className="w-full h-28 rounded-xl overflow-hidden border border-white/10 bg-[#111520]">
                <iframe
                  title="Ubicación de la sede"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26620.1504953322!2d-70.7818788!3d-33.5135242!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9662c2df9e8e2c0b%3A0x6b4a520ccdc27b3b!2sMaip%C3%BA%2C%20Regi%C3%B3n%20Metropolitana!5e0!3m2!1ses!2scl!4v1700000000000!5m2!1ses!2scl"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'grayscale(35%) invert(90%) contrast(88%)' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>

          {/* Barra inferior única */}
          <div className="border-t border-white/[0.06] bg-[#07090e]">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-500">
              <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                <SnoverusMark size={18} />
                <span>
                  © {year}{' '}
                  <strong className="text-slate-300">{tenantName || BRAND_NAME}</strong> · Tecnología{' '}
                  <strong className="text-slate-300">{BRAND_LEGAL}</strong>
                </span>
              </div>
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setLegalModal('terminos')}
                  className="hover:text-[#e5b32a] transition-colors cursor-pointer"
                >
                  Términos y Condiciones
                </button>
                <button
                  type="button"
                  onClick={() => setLegalModal('privacidad')}
                  className="hover:text-[#e5b32a] transition-colors cursor-pointer"
                >
                  Política de Privacidad
                </button>
              </div>
            </div>
          </div>
        </footer>
      ) : (
        /* ================= FOOTER COMPACTO CORPORATIVO (/planes, /postular, /superadmin, etc.) ================= */
        <footer className="bg-[#090b10] border-t border-white/[0.07] text-slate-400 mt-auto relative z-10 w-full">
          <div className="max-w-6xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <SnoverusMark size={20} />
              <span className="text-slate-400">
                © {year} <strong className="text-slate-200">{BRAND_LEGAL}</strong> · Plataforma SaaS Multi-Tenant
              </span>
            </div>

            <div className="flex items-center gap-5 text-[11px]">
              <button
                type="button"
                onClick={() => setLegalModal('terminos')}
                className="text-slate-400 hover:text-[#e5b32a] transition-colors cursor-pointer"
              >
                Términos y Condiciones
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('privacidad')}
                className="text-slate-400 hover:text-[#e5b32a] transition-colors cursor-pointer"
              >
                Privacidad y Patente
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* ================= MODAL LEGAL FUNCIONAL ================= */}
      {legalModal && (
        <div
          onClick={() => setLegalModal(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[82vh] flex flex-col bg-[#111520] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <SnoverusMark size={22} />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Marco Legal y Propiedad Intelectual · {BRAND_NAME}®
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">{BRAND_LEGAL} · Chile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-6 pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setLegalModal('terminos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  legalModal === 'terminos'
                    ? 'bg-[#e5b32a] text-[#090b10]'
                    : 'bg-white/[0.05] text-slate-300 hover:text-white'
                }`}
              >
                Términos y Patente
              </button>
              <button
                type="button"
                onClick={() => setLegalModal('privacidad')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  legalModal === 'privacidad'
                    ? 'bg-[#e5b32a] text-[#090b10]'
                    : 'bg-white/[0.05] text-slate-300 hover:text-white'
                }`}
              >
                Privacidad y Datos
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs text-slate-300 leading-relaxed space-y-4">
              {legalModal === 'terminos' ? (
                <>
                  <div>
                    <h4 className="text-white font-semibold mb-1">1. Servicio SaaS Multi-Tenant</h4>
                    <p>
                      <strong>{BRAND_NAME}®</strong> es una plataforma tecnológica operada por{' '}
                      <strong>{BRAND_LEGAL}</strong>. Cada sindicato cliente opera en una instancia
                      lógica aislada identificada por su ID institucional, manteniendo independencia
                      total de su padrón y configuración.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      2. Propiedad Intelectual y Marca Registrada
                    </h4>
                    <p>
                      El código fuente, arquitectura de datos multi-tenant, interfaces UI/UX,
                      flujos de verificación criptográfica y signos distintivos de{' '}
                      <strong>{BRAND_NAME}®</strong> pertenecen a <strong>{BRAND_LEGAL}</strong> y
                      están protegidos por la Ley N.º 17.336 y la Ley N.º 19.039 en Chile.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">3. Pagos, Trial y Uso Responsable</h4>
                    <p>
                      Los planes de suscripción y el periodo Trial de 30 días operan a través de
                      Webpay Plus (Transbank). La directiva de cada organización es responsable de
                      la administración de su padrón y credenciales de acceso.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h4 className="text-white font-semibold mb-1">
                      1. Cumplimiento Ley 19.628 y Ley 21.719
                    </h4>
                    <p>
                      Los datos personales (RUT, nombre, correo, teléfono y registros sindicales) se
                      utilizan exclusivamente para habilitar los módulos contratados por cada
                      organización.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">2. Seguridad y Cifrado</h4>
                    <p>
                      Toda la plataforma aplica aislamiento por fila (PostgreSQL RLS), cifrado
                      irreversible Bcrypt para claves y códigos de un solo uso, y transporte cifrado
                      HTTPS/TLS.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">3. Cookies Técnicas</h4>
                    <p>
                      Se emplean cookies esenciales para mantener la sesión autenticada y el rol
                      asignado de forma segura en navegadores de escritorio y móviles.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-3 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 rounded-lg bg-[#e5b32a] hover:bg-[#f0c038] text-[#090b10] text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}