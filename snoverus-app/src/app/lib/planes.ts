export type PlanId = 'trial' | 'basico' | 'estandar' | 'premium';

export interface DefinicionPlan {
  id: PlanId;
  nombre: string;
  descripcion: string;
  precioMensual: number;
  precioTexto: string;
  periodo: string;
  esTrial: boolean;
  destacado?: boolean;
  maxSocios: number; // 999999 = ilimitado
  maxSociosTexto: string;
  features: string[];
  modulos_activos: Record<string, boolean>;
}

export const PLANES_SAAS: Record<PlanId, DefinicionPlan> = {
  trial: {
    id: 'trial',
    nombre: 'Trial 30 Días Gratis',
    descripcion: 'Prueba la plataforma con tu sindicato durante 30 días sin costo ni compromiso.',
    precioMensual: 0,
    precioTexto: '$0',
    periodo: '30 días gratis',
    esTrial: true,
    maxSocios: 20,
    maxSociosTexto: 'Hasta 20 socios (30 días)',
    features: [
      '1 Administrador único con ID de sindicato',
      'Hasta 20 socios de prueba',
      'Portal de socios con login por RUT',
      'Beneficios, Credencial QR y Actas digitales',
      'Soporte base durante el periodo de prueba'
    ],
    modulos_activos: {
      beneficios: true,
      credencial: true,
      actas: true,
      soporte: true,
      asistencia: true,
      legal: false,
      finanzas: false,
      encuestas: false,
      negociacion: false,
      solidario: false
    }
  },
  basico: {
    id: 'basico',
    nombre: 'Básico',
    descripcion: 'Para sindicatos pequeños que dan sus primeros pasos en la digitalización.',
    precioMensual: 4990,
    precioTexto: '$4.990',
    periodo: '/mes',
    esTrial: false,
    maxSocios: 25,
    maxSociosTexto: 'Hasta 25 socios',
    features: [
      '1 Administrador único',
      'Hasta 25 socios',
      'Portal de socios con login por RUT',
      'Gestión de beneficios básicos',
      'Credencial digital QR y mesa de soporte'
    ],
    modulos_activos: {
      beneficios: true,
      credencial: true,
      soporte: true,
      actas: false,
      asistencia: false,
      legal: false,
      finanzas: false,
      encuestas: false,
      negociacion: false,
      solidario: false
    }
  },
  estandar: {
    id: 'estandar',
    nombre: 'Estándar',
    descripcion: 'El plan elegido. Todo lo necesario para gestionar un sindicato activo.',
    precioMensual: 9990,
    precioTexto: '$9.990',
    periodo: '/mes',
    esTrial: false,
    destacado: true,
    maxSocios: 50,
    maxSociosTexto: 'Hasta 50 socios',
    features: [
      '1 Administrador único',
      'Hasta 50 socios',
      'Portal de socios con login por RUT',
      'Gestión de beneficios completa',
      'Actas, documentos digitales y control de asistencia QR',
      'Votaciones digitales y Fondo Solidario'
    ],
    modulos_activos: {
      beneficios: true,
      credencial: true,
      soporte: true,
      actas: true,
      asistencia: true,
      encuestas: true,
      solidario: true,
      legal: false,
      finanzas: false,
      negociacion: false
    }
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    descripcion: 'Para organizaciones grandes que necesitan el máximo control y personalización.',
    precioMensual: 14990,
    precioTexto: '$14.990',
    periodo: '/mes',
    esTrial: false,
    maxSocios: 999999,
    maxSociosTexto: 'Socios ilimitados',
    features: [
      '1 Administrador único con control total',
      'Socios ilimitados',
      'Todos los módulos activos (10/10)',
      'Asistente Legal Inteligente IA 24/7',
      'Finanzas, balances y Negociación Colectiva',
      'Personalización visual completa (Estudio UI)'
    ],
    modulos_activos: {
      beneficios: true,
      legal: true,
      credencial: true,
      asistencia: true,
      actas: true,
      finanzas: true,
      encuestas: true,
      negociacion: true,
      solidario: true,
      soporte: true
    }
  }
};

export const ETIQUETAS_MODULOS: Record<string, string> = {
  beneficios: 'Beneficios',
  legal: 'Asistente Legal IA',
  credencial: 'Credencial QR',
  asistencia: 'Asistencia QR',
  actas: 'Actas Digitales',
  finanzas: 'Finanzas y Balances',
  encuestas: 'Votaciones',
  negociacion: 'Negociación Colectiva',
  solidario: 'Fondo Solidario',
  soporte: 'Soporte'
};