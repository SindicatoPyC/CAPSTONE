'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import './landing.css';

// ─── CANVAS: fondo urbano generativo ──────────────────────────────────────────
// Se dibuja una vez al montar el componente. No depende de props ni estado.
function useCityCanvas(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // Cielo: gradiente vertical noche → amanecer dorado
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.82);
    sky.addColorStop(0,    '#0d0f14');
    sky.addColorStop(0.45, '#151820');
    sky.addColorStop(0.75, '#1e1a0e');
    sky.addColorStop(1,    '#2a2010');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Resplandor sol (derecha, nivel horizonte)
    const glow = ctx.createRadialGradient(W * 0.72, H * 0.60, 0, W * 0.72, H * 0.60, W * 0.38);
    glow.addColorStop(0,    'rgba(201,148,10,0.22)');
    glow.addColorStop(0.4,  'rgba(201,148,10,0.09)');
    glow.addColorStop(1,    'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Edificios
    const rng = (min: number, max: number) => min + Math.random() * (max - min);
    const groundY = H * 0.78;

    interface Building { x: number; w: number; h: number; layer: number }
    const buildings: Building[] = [];

    // Capa trasera — más baja y gris
    let x = 0;
    while (x < W) {
      const w = rng(28, 60);
      const h = rng(H * 0.12, H * 0.30);
      buildings.push({ x, w, h, layer: 0 });
      x += w + rng(0, 4);
    }
    // Capa delantera — más alta y variada
    x = -20;
    while (x < W + 20) {
      const w = rng(22, 52);
      const h = rng(H * 0.22, H * 0.52);
      buildings.push({ x, w, h, layer: 1 });
      x += w + rng(2, 8);
    }

    // Dibuja cada capa
    [0, 1].forEach(layer => {
      buildings
        .filter(b => b.layer === layer)
        .forEach(b => {
          const top = groundY - b.h;
          // Silueta del edificio
          ctx.fillStyle = layer === 0 ? '#1a1c22' : '#13151b';
          ctx.fillRect(b.x, top, b.w, b.h);

          // Ventanas iluminadas
          const cols = Math.floor(b.w / 9);
          const rows = Math.floor(b.h / 11);
          for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
              if (Math.random() > 0.55) continue;   // mayoría apagadas
              const wx = b.x + 3 + col * 9;
              const wy = top  + 4 + row * 11;
              // Color ventana: dorado cálido o azul frío
              const warm = Math.random() > 0.3;
              ctx.fillStyle = warm
                ? `rgba(255,210,90,${rng(0.3, 0.65)})`
                : `rgba(140,190,255,${rng(0.2, 0.45)})`;
              ctx.fillRect(wx, wy, 5, 6);
            }
          }
        });
    });

    // Suelo y reflejo dorado
    const ground = ctx.createLinearGradient(0, groundY, 0, H);
    ground.addColorStop(0, '#1a1508');
    ground.addColorStop(1, '#0d0f14');
    ctx.fillStyle = ground;
    ctx.fillRect(0, groundY, W, H - groundY);

    // Línea de reflejo
    const ref_ = ctx.createLinearGradient(W * 0.3, groundY, W * 0.9, groundY);
    ref_.addColorStop(0,   'transparent');
    ref_.addColorStop(0.4, 'rgba(201,148,10,0.18)');
    ref_.addColorStop(1,   'transparent');
    ctx.fillStyle = ref_;
    ctx.fillRect(0, groundY, W, 2);
  }, [canvasRef]);
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
function LandingPage() {
  const [rut, setRut]           = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useCityCanvas(canvasRef);

  const searchParams    = useSearchParams();
  const redirectDestino = searchParams.get('redirect');

  // Cierra drawer con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Bloquea scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // ── LOGIN: lógica original sin cambios ────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanRut = rut.replace(/[^0-9kK]/g, '').toUpperCase();

    try {
      const supabase = createClient();

      const { data: realEmail, error: rpcError } = await supabase.rpc('get_email_por_rut', {
        p_rut: cleanRut,
      });

      if (rpcError || !realEmail) {
        throw new Error('No encontramos una cuenta asociada a este RUT.');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: realEmail,
        password,
      });

      if (authError) throw new Error('RUT o contraseña incorrectos.');

      if (authData.session) {
        document.cookie = `sb-sindicato-session=${authData.user.email}; path=/; max-age=86400`;

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          throw new Error('Error al obtener los permisos del usuario.');
        }

        document.cookie = `sb-sindicato-rol=${profileData.role}; path=/; max-age=86400`;

        // REDIRECCIÓN INTELIGENTE CON MEMORIA DE QR
        const urlParams       = new URLSearchParams(window.location.search);
        const redirectDestinoReal = urlParams.get('redirect');

        if (redirectDestinoReal) {
          window.location.href = redirectDestinoReal;
        } else {
          const rolUsuario = String(profileData.role || '').trim().toLowerCase();
          if (rolUsuario === 'superadmin') {
            window.location.href = '/superadmin';
          } else if (rolUsuario === 'admin' || rolUsuario === 'administrador') {
            window.location.href = '/dashboard/admin';
          } else {
            window.location.href = '/dashboard';
          }
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión. Por favor, verifica tus datos.');
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh' }}>

        {/* ── NAVBAR ── */}
        <nav className="pyc-nav">
          <div className="pyc-nav-brand">
            <div className="pyc-nav-mark">PYC</div>
            <span className="pyc-nav-name">Sindicato PYC</span>
          </div>
          <ul className="pyc-nav-links">
            <li><a href="#">Inicio</a></li>
            <li><a href="#nosotros">Nosotros</a></li>
            <li><a href="#planes">Planes</a></li>
          </ul>
          <button className="pyc-nav-cta" onClick={() => setDrawerOpen(true)}>
            Ingresar
          </button>
        </nav>

        {/* ── HERO ── */}
        <section className="pyc-hero">
          <canvas ref={canvasRef} className="pyc-hero-canvas" />
          <div className="pyc-hero-overlay" />

          <div className="pyc-hero-content">
            <div className="pyc-hero-tag">✊ Organización Gremial</div>
            <h1 className="pyc-hero-title">
              Tu sindicato,<br /><em>unido</em> y digital
            </h1>
            <p className="pyc-hero-sub">
              Gestiona beneficios, votaciones, actas y asesoría legal en un solo lugar.
              Pensado para trabajadores, construido por trabajadores.
            </p>
            <div className="pyc-hero-actions">
              <button className="pyc-btn-primary" onClick={() => setDrawerOpen(true)}>
                Ingresar al Portal
              </button>
              <a href="#nosotros" className="pyc-btn-ghost">Conocer más</a>
            </div>
          </div>

          {/* Franja de estadísticas pegada al fondo del hero */}
          <div className="pyc-stats">
            <div className="pyc-stat">
              <div className="pyc-stat-num">+<span>240</span></div>
              <div className="pyc-stat-label">Socios activos</div>
            </div>
            <div className="pyc-stat">
              <div className="pyc-stat-num"><span>12</span></div>
              <div className="pyc-stat-label">Beneficios vigentes</div>
            </div>
            <div className="pyc-stat">
              <div className="pyc-stat-num"><span>3</span></div>
              <div className="pyc-stat-label">Años de historia</div>
            </div>
          </div>
        </section>

        {/* ── SOBRE NOSOTROS ── */}
        <section className="pyc-section" id="nosotros">
          <div className="pyc-section-tag">Sobre nosotros</div>
          <h2 className="pyc-section-title">Creados para representar a quienes trabajan</h2>

          <div className="pyc-nosotros-grid">
            {/* Columna izquierda: texto introductorio */}
            <div>
              <p className="pyc-nosotros-intro">
                El Sindicato PYC nace de la convicción de que los trabajadores merecen una
                representación transparente, accesible y moderna. Nuestra plataforma reúne
                en un solo espacio todo lo que necesitas: desde tus beneficios hasta el
                respaldo legal que te corresponde.
              </p>
              <p className="pyc-nosotros-intro" style={{ marginTop: '16px' }}>
                Creemos en la democracia interna y en la información abierta. Cada socio
                tiene voz y acceso a las decisiones que moldean nuestra organización.
              </p>
            </div>

            {/* Columna derecha: 4 pilares en 2×2 */}
            <div className="pyc-pillars">
              <div className="pyc-pillar">
                <div className="pyc-pillar-icon">✊</div>
                <h3>Representación colectiva</h3>
                <p>Negociamos en conjunto para obtener mejores condiciones laborales y salariales.</p>
              </div>
              <div className="pyc-pillar">
                <div className="pyc-pillar-icon">🎁</div>
                <h3>Beneficios exclusivos</h3>
                <p>Convenios en salud, educación y recreación para ti y tu grupo familiar.</p>
              </div>
              <div className="pyc-pillar">
                <div className="pyc-pillar-icon">⚖️</div>
                <h3>Asesoría legal</h3>
                <p>Acceso a respaldo jurídico, actas y asambleas de manera abierta y segura.</p>
              </div>
              <div className="pyc-pillar">
                <div className="pyc-pillar-icon">🗳️</div>
                <h3>Democracia interna</h3>
                <p>Votaciones digitales y encuestas para que tu voz siempre cuente.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="pyc-divider" />

        {/* ── PLANES ── */}
        <div className="pyc-planes-band" id="planes">
          <div className="pyc-section-tag">Digitaliza tu sindicato</div>
          <h2>¿Eres dirigente y quieres esta plataforma<br />para tu organización?</h2>
          <p>Planes flexibles para sindicatos de cualquier tamaño. Sin contratos largos, sin letra chica.</p>
          <Link href="/planes" className="pyc-btn-primary">Ver planes y precios</Link>
        </div>

        {/* ── FOOTER CTA ── */}
        <div className="pyc-footer-cta">
          <h2>¿Ya eres socio?</h2>
          <p>Ingresa con tu RUT y contraseña para acceder a todos tus beneficios.</p>
          <button className="pyc-btn-primary" onClick={() => setDrawerOpen(true)}>
            Ingresar al Portal
          </button>
        </div>

        <div className="pyc-footer-bottom">
          <span>© 2026 Sindicato PYC. Todos los derechos reservados.</span>
          <span>Desarrollado por equipo Capstone · Duoc UC</span>
        </div>

        {/* ══════════════════════════════════════════
            DRAWER + OVERLAY
            AnimatePresence gestiona el montaje /
            desmontaje con animación de entrada/salida
        ══════════════════════════════════════════ */}
        <AnimatePresence>
          {drawerOpen && (
            <>
              {/* Overlay oscuro */}
              <motion.div
                className="pyc-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setDrawerOpen(false)}
              />

              {/* Panel lateral */}
              <motion.div
                className="pyc-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.36, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Cabecera del drawer */}
                <div className="pyc-drawer-header">
                  <div className="pyc-drawer-brand">
                    <div className="pyc-drawer-mark">PYC</div>
                    <span className="pyc-drawer-brand-name">Sindicato PYC</span>
                  </div>
                  <button className="pyc-drawer-close" onClick={() => setDrawerOpen(false)}>✕</button>
                </div>

                {/* Formulario */}
                <div className="pyc-drawer-body">
                  <div className="pyc-drawer-eyebrow">Portal de Socios</div>
                  <h2 className="pyc-drawer-title">Bienvenido de vuelta</h2>
                  <p className="pyc-drawer-subtitle">
                    {redirectDestino
                      ? 'Inicia sesión para registrar tu asistencia.'
                      : 'Ingresa con tu RUT y contraseña.'}
                  </p>

                  {/* Error */}
                  {errorMsg && (
                    <motion.div
                      className="pyc-error"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <span>⚠️</span> {errorMsg}
                    </motion.div>
                  )}

                  <form onSubmit={handleLogin}>
                    <div className="pyc-field-label">RUT del Socio</div>
                    <input
                      className="pyc-input"
                      type="text"
                      required
                      placeholder="Ej: 11.111.111-1"
                      value={rut}
                      onChange={e => setRut(e.target.value)}
                      autoFocus
                    />

                    <div className="pyc-field-label">
                      <span>Contraseña</span>
                      <Link href="/forgot-password">¿Olvidaste tu clave?</Link>
                    </div>
                    <input
                      className="pyc-input"
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />

                    <button className="pyc-drawer-btn" type="submit" disabled={loading}>
                      {loading ? 'Verificando...' : (redirectDestino ? 'Ingresar y Confirmar Asistencia' : 'Ingresar al Portal')}
                    </button>
                  </form>

                  <div className="pyc-sep">¿Aún no eres socio?</div>

                  <Link href="/postular" className="pyc-drawer-secondary">
                    Postular al Sindicato
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
// Suspense es obligatorio porque usamos useSearchParams() dentro de LandingPage
export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: '#181a1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(201,148,10,0.3)', borderTopColor: '#C9940A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      }
    >
      <LandingPage />
    </Suspense>
  );
}
