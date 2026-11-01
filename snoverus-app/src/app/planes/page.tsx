'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../landing.css';

// ─── DATOS ────────────────────────────────────────────────────────────────────
const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    mensual: 4990,
    descripcion: 'Para sindicatos pequeños que dan sus primeros pasos en la digitalización.',
    destacado: false,
    features: [
      'Hasta 25 socios',
      'Portal de socios con login por RUT',
      'Gestión de beneficios básicos',
      'Actas digitales',
      'Soporte por correo',
    ],
    noIncluye: [
      'Votaciones digitales',
      'Módulo de asesoría legal',
      'Reportes avanzados',
      'API de integración',
    ],
    cta: 'Empezar con Básico',
  },
  {
    id: 'estandar',
    nombre: 'Estándar',
    mensual: 9990,
    descripcion: 'El plan más elegido. Todo lo necesario para gestionar un sindicato activo.',
    destacado: true,
    features: [
      'Hasta 50 socios',
      'Portal de socios con login por RUT',
      'Gestión de beneficios completa',
      'Actas y documentos digitales',
      'Votaciones digitales',
      'Módulo de asesoría legal',
      'Reportes y estadísticas',
      'Soporte prioritario',
    ],
    noIncluye: [
      'API de integración',
      'Dominio personalizado',
    ],
    cta: 'Empezar con Estándar',
  },
  {
    id: 'premium',
    nombre: 'Premium',
    mensual: 14990,
    descripcion: 'Para organizaciones grandes que necesitan el máximo control y personalización.',
    destacado: false,
    features: [
      'Socios ilimitados',
      'Portal de socios con login por RUT',
      'Gestión de beneficios completa',
      'Actas y documentos digitales',
      'Votaciones digitales',
      'Módulo de asesoría legal',
      'Reportes y estadísticas avanzados',
      'API de integración',
      'Dominio personalizado',
      'Soporte dedicado 24/7',
    ],
    noIncluye: [],
    cta: 'Contactar para Premium',
  },
];

const FAQS = [
  {
    q: '¿Puedo cambiar de plan más adelante?',
    a: 'Sí, puedes subir o bajar de plan en cualquier momento. El cambio se aplica al inicio del siguiente período de facturación.',
  },
  {
    q: '¿Existe un período de prueba?',
    a: 'Sí, ofrecemos 30 días de prueba gratuita en los planes Básico y Estándar. No se requiere tarjeta de crédito para comenzar.',
  },
  {
    q: '¿Cómo se cobra el plan anual?',
    a: 'Se cobra el equivalente a 10 meses al inicio del año — pagas una vez y tienes el servicio completo por 12 meses, ahorrando 2 meses.',
  },
  {
    q: '¿Cómo migro los datos de mi sindicato actual?',
    a: 'Nuestro equipo te acompaña en el proceso de migración sin costo adicional. Basta con enviarnos el listado de socios en Excel y nosotros hacemos el resto.',
  },
];

// ─── UTILIDADES ───────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '$' + n.toLocaleString('es-CL');
}

function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="7.5" cy="7.5" r="7.5" fill="rgba(201,148,10,0.15)" />
      <path d="M4.5 7.5l2 2 4-4" stroke="#C9940A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="7.5" cy="7.5" r="7.5" fill="rgba(255,255,255,0.04)" />
      <path d="M5 5l5 5M10 5l-5 5" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── MODAL DE COMPRA ──────────────────────────────────────────────────────────
type Plan = typeof PLANES[number];

function ModalCompra({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [ciclo, setCiclo] = useState<'mensual' | 'anual'>('mensual');

  const precioMensual = plan.mensual;
  const precioAnual   = plan.mensual * 10;           // 10 meses = 2 gratis
  const ahorro        = plan.mensual * 2;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(5px)',
          zIndex: 300,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 301,
        width: 'min(780px, 94vw)',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        overflow: 'hidden',
      }} className="pyc-modal-grid">

        {/* ── Columna izquierda: resumen del plan ── */}
        <div style={{
          padding: '36px 32px',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--gold)', marginBottom: 10,
          }}>
            Plan incluido
          </div>
          <div style={{
            fontSize: 22, fontWeight: 800,
            color: 'var(--fg)', marginBottom: 6,
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}>
            {plan.nombre}
          </div>
          <p style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.6, marginBottom: 28 }}>
            {plan.descripcion}
          </p>

          <div style={{ height: 1, background: 'var(--border)', marginBottom: 24 }} />

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
            {plan.features.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--fg2)' }}>
                <IconCheck />{f}
              </li>
            ))}
            {plan.noIncluye.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--fg3)' }}>
                <IconX />{f}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Columna derecha: opciones de pago ── */}
        <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column' }}>

          {/* Cerrar */}
          <button
            onClick={onClose}
            style={{
              alignSelf: 'flex-end',
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--bg3)', border: '1px solid var(--border)',
              color: 'var(--fg2)', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 24,
            }}
          >✕</button>

          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg2)', marginBottom: 12 }}>
            Elige tu ciclo de pago
          </div>

          {/* Toggle mensual / anual */}
          {(['mensual', 'anual'] as const).map(c => {
            const activo = ciclo === c;
            const esAnual = c === 'anual';
            return (
              <button
                key={c}
                onClick={() => setCiclo(c)}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  borderRadius: 12,
                  border: activo ? '2px solid #C9940A' : '2px solid var(--border)',
                  background: activo ? 'rgba(201,148,10,0.12)' : 'var(--bg3)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: 10,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  {/* Radio + texto */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Radio visual */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: activo ? '2px solid #C9940A' : '2px solid var(--fg3)',
                      background: 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border-color 0.15s',
                    }}>
                      {activo && (
                        <div style={{
                          width: 9, height: 9, borderRadius: '50%',
                          background: '#C9940A',
                        }} />
                      )}
                    </div>
                    <div>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: activo ? '#ECEAE3' : 'var(--fg2)',
                        marginBottom: 2,
                        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                      }}>
                        {esAnual ? 'Pago anual' : 'Pago mensual'}
                      </div>
                      <div style={{ fontSize: 12, color: activo ? 'rgba(201,148,10,0.9)' : 'var(--fg3)' }}>
                        {esAnual
                          ? `${fmt(precioAnual)} al año · ${fmt(precioMensual)}/mes`
                          : `${fmt(precioMensual)} al mes`}
                      </div>
                    </div>
                  </div>
                  {/* Badge ahorro */}
                  {esAnual && (
                    <div style={{
                      background: '#C9940A',
                      color: '#000',
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '4px 9px',
                      borderRadius: 100,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      letterSpacing: '0.02em',
                    }}>
                      Ahorras {fmt(ahorro)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Resumen del total */}
          <div style={{
            marginTop: 8,
            padding: '16px 20px',
            background: 'rgba(201,148,10,0.06)',
            border: '1px solid var(--gold-line)',
            borderRadius: 12,
            marginBottom: 24,
          }}>
            <div style={{ fontSize: 12, color: 'var(--fg3)', marginBottom: 4 }}>Total a pagar hoy</div>
            <div style={{
              fontSize: 28, fontWeight: 800,
              color: 'var(--fg)',
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              letterSpacing: '-0.02em',
            }}>
              {ciclo === 'mensual' ? fmt(precioMensual) : fmt(precioAnual)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 4 }}>
              {ciclo === 'anual' ? '12 meses de acceso · incluye IVA' : 'Primer mes · incluye IVA'}
            </div>
          </div>

          {/* Botón de acción */}
          <button style={{
            width: '100%',
            background: 'var(--gold)',
            color: '#000',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            padding: '14px',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
          }}>
            Continuar con {plan.nombre} {ciclo === 'anual' ? '(anual)' : '(mensual)'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--fg3)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
            30 días de prueba gratis. Puedes cancelar en cualquier momento.
          </p>
        </div>
      </div>
    </>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function PlanesPage() {
  const [modalPlan, setModalPlan] = useState<Plan | null>(null);

  return (
    <div style={{
      background: 'var(--bg)',
      color: 'var(--fg)',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      minHeight: '100vh',
    }}>

      {/* ── NAVBAR ── */}
      <nav className="pyc-nav">
        <div className="pyc-nav-brand">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <div className="pyc-nav-mark">PYC</div>
            <span className="pyc-nav-name">Sindicato PYC</span>
          </Link>
        </div>
        <ul className="pyc-nav-links">
          <li><Link href="/">Inicio</Link></li>
          <li><Link href="/#nosotros">Nosotros</Link></li>
          <li><a href="#planes" style={{ color: 'var(--gold)' }}>Planes</a></li>
        </ul>
        <Link href="/" className="pyc-nav-cta">Ingresar</Link>
      </nav>

      {/* ── ENCABEZADO ── */}
      <header style={{
        paddingTop: 120, paddingBottom: 64,
        paddingLeft: 48, paddingRight: 48,
        textAlign: 'center', maxWidth: 680, margin: '0 auto',
      }}>
        <div className="pyc-section-tag" style={{ justifyContent: 'center', display: 'flex', marginBottom: 16 }}>
          Para dirigentes
        </div>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 'clamp(30px, 5vw, 48px)',
          fontWeight: 800, color: 'var(--fg)',
          letterSpacing: '-0.025em', lineHeight: 1.08, marginBottom: 18,
        }}>
          Digitaliza tu sindicato<br />sin complicaciones
        </h1>
        <p style={{ fontSize: 16, color: 'var(--fg2)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto' }}>
          Planes flexibles para organizaciones de cualquier tamaño.
          Sin contratos largos, sin letra chica. Los primeros 30 días son gratis.
        </p>
      </header>

      {/* ── TARJETAS ── */}
      <section id="planes" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20, maxWidth: 1040,
        margin: '0 auto', padding: '0 48px 96px',
      }} className="pyc-planes-grid">

        {PLANES.map(plan => (
          <div key={plan.id} style={{
            background: plan.destacado ? 'var(--bg2)' : 'var(--bg)',
            border: plan.destacado ? '1px solid var(--gold-line)' : '1px solid var(--border)',
            borderRadius: 18, padding: '32px 28px',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
          }}>

            {plan.destacado && (
              <div style={{
                position: 'absolute', top: -13, left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--gold)', color: '#000',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap',
              }}>
                Más popular
              </div>
            )}

            {/* Nombre */}
            <div style={{
              fontSize: 17, fontWeight: 800,
              color: plan.destacado ? 'var(--gold)' : 'var(--fg)',
              marginBottom: 8,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}>
              {plan.nombre}
            </div>
            <p style={{ fontSize: 13, color: 'var(--fg2)', lineHeight: 1.6, marginBottom: 24 }}>
              {plan.descripcion}
            </p>

            {/* Precio */}
            <div style={{ marginBottom: 24 }}>
              <span style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: 36, fontWeight: 800,
                color: 'var(--fg)', letterSpacing: '-0.03em', lineHeight: 1,
              }}>
                {fmt(plan.mensual)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--fg3)', marginLeft: 6 }}>/mes</span>
            </div>

            {/* CTA */}
            <button
              onClick={() => setModalPlan(plan)}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                padding: '12px 20px', borderRadius: 10,
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                marginBottom: 24,
                background: plan.destacado ? 'var(--gold)' : 'transparent',
                color: plan.destacado ? '#000' : 'var(--fg2)',
                border: plan.destacado ? 'none' : '1px solid var(--border)',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {plan.cta}
            </button>

            <div style={{ height: 1, background: 'var(--border)', marginBottom: 22 }} />

            {/* Features */}
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--fg2)' }}>
                  <IconCheck />{f}
                </li>
              ))}
              {plan.noIncluye.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--fg3)' }}>
                  <IconX />{f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="pyc-divider" />

      {/* ── PREGUNTAS FRECUENTES ── */}
      <section style={{ maxWidth: 680, margin: '0 auto', padding: '88px 48px' }}>
        <div className="pyc-section-tag" style={{ marginBottom: 12 }}>Preguntas frecuentes</div>
        <h2 style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 'clamp(22px, 3.5vw, 32px)',
          fontWeight: 800, color: 'var(--fg)',
          letterSpacing: '-0.02em', marginBottom: 48,
        }}>
          Todo lo que necesitas saber
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 24 }}>
              <h3 style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: 15, fontWeight: 700, color: 'var(--fg)',
                marginBottom: 8, letterSpacing: '-0.01em',
              }}>
                {faq.q}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--fg2)', lineHeight: 1.7 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="pyc-divider" />

      {/* ── CTA FINAL ── */}
      <div className="pyc-footer-cta">
        <h2>¿Listo para digitalizar tu sindicato?</h2>
        <p>Empieza gratis por 30 días, sin tarjeta de crédito.</p>
        <Link href="/contacto" className="pyc-btn-primary">Contactar al equipo</Link>
      </div>

      {/* ── FOOTER ── */}
      <div className="pyc-footer-bottom">
        <span>© 2026 Sindicato PYC. Todos los derechos reservados.</span>
        <span>Desarrollado por equipo Capstone · Duoc UC</span>
      </div>

      {/* ── MODAL ── */}
      {modalPlan && <ModalCompra plan={modalPlan} onClose={() => setModalPlan(null)} />}

      {/* Responsive */}
      <style>{`
        @media (max-width: 700px) {
          .pyc-modal-grid { grid-template-columns: 1fr !important; }
          .pyc-modal-grid > div:first-child { display: none; }
        }
      `}</style>

    </div>
  );
}
