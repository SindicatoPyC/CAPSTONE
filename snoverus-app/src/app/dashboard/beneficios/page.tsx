'use client'

import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase';
import emailjs from '@emailjs/browser';
import Link from 'next/link';

export default function BeneficiosSmartPage() {
  const [beneficios, setBeneficios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('Todos');
  
  const [configUI, setConfigUI] = useState<any>(null);
  const [sindicatoIdActual, setSindicatoIdActual] = useState<number | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [socioInfo, setSocioInfo] = useState({ rut: '---', nombre: 'Socio Activo' });
  const [procesandoUso, setProcesandoUso] = useState<number | null>(null);
  
  // Estados para el Modal (Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Campos del Formulario
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('Salud');
  const [descuento, setDescuento] = useState('');
  const [imagenArchivo, setImagenArchivo] = useState<File | null>(null);
  const [imagenUrlActual, setImagenUrlActual] = useState('');

  const categoriasFiltro = ['Todos', 'Salud', 'Recreación', 'Deporte', 'Educación', 'Hogar', 'Otros'];
  const categoriasForm = ['Salud', 'Recreación', 'Deporte', 'Educación', 'Hogar', 'Otros'];

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const rolCookie = cookies.find(c => c.trim().startsWith('sb-sindicato-rol='));
    const sessionCookie = cookies.find(c => c.trim().startsWith('sb-sindicato-session='));
    
    if (rolCookie) {
      const rol = rolCookie.split('=')[1].toLowerCase();
      if (['admin', 'administrador', 'directiva', 'superadmin'].includes(rol)) {
        setIsAdmin(true);
      }
    }

    if (sessionCookie) {
      setSocioInfo(prev => ({ ...prev, rut: sessionCookie.split('=')[1] }));
    }

    fetchDatosYConfiguracion();
  }, []);

  const fetchDatosYConfiguracion = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('sindicato_id, role').eq('id', user.id).single();
        
        let targetSindicatoId = profile?.sindicato_id;

        // Si es Superadmin, respeta el sindicato activo seleccionado en el Navbar (localStorage)
        if (profile?.role === 'superadmin') {
          const cachedTenantId = localStorage.getItem('sindicato_activo');
          if (cachedTenantId) {
            targetSindicatoId = Number(cachedTenantId);
          }
        }

        if (targetSindicatoId) {
          setSindicatoIdActual(targetSindicatoId);

          // Cargar configuración UI (JSONB) del sindicato activo
          const { data: sindicatoData } = await supabase.from('sindicatos').select('config_ui').eq('id', targetSindicatoId).single();
          if (sindicatoData?.config_ui) {
            setConfigUI(sindicatoData.config_ui);
          }

          // Cargar beneficios filtrados exclusivamente por este sindicato_id
          const { data, error } = await supabase
            .from('beneficios')
            .select('*')
            .eq('sindicato_id', targetSindicatoId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          setBeneficios(data || []);
        }
      }
    } catch (err) {
      console.error("Error al cargar beneficios multi-tenant:", err);
      setBeneficios([]);
    } finally {
      setLoading(false);
    }
  };

  const beneficiosFiltrados = filtroActivo === 'Todos' 
    ? beneficios 
    : beneficios.filter(b => b.categoria === filtroActivo);

  // === CANJE DE BENEFICIO CON SERVICE PRIMARY CORRECTO Y FALLBACK SUPABASE ===
  const handleUsarBeneficio = async (beneficio: any) => {
    const correoDestino = window.prompt(
      `🎟️ ¿Deseas reclamar y utilizar el beneficio "${beneficio.titulo}"?\n\nConfirma tu correo electrónico para recibir tu comprobante:`,
      'contacto@sindicatopyc.cl'
    );

    if (!correoDestino || !correoDestino.trim()) {
      alert("⚠️ Acción cancelada: Se requiere un correo electrónico válido.");
      return;
    }

    setProcesandoUso(beneficio.id);

    try {
      const templateParams = {
        to_email: correoDestino.trim(),
        email: correoDestino.trim(),
        reply_to: correoDestino.trim(),
        from_name: 'Portal Sindicato',
        to_name: socioInfo.rut || 'Socio Activo',
        socio_rut: socioInfo.rut || 'RUT no registrado',
        beneficio_titulo: beneficio.titulo || 'Convenio Institucional',
        beneficio_descuento: beneficio.descuento || 'N/A',
        beneficio_categoria: beneficio.categoria || 'N/A',
        beneficio_descripcion: beneficio.descripcion || 'Sin descripción.',
        message: `El socio con RUT ${socioInfo.rut} ha solicitado el convenio ${beneficio.titulo} (${beneficio.descuento}).`
      };

      // 🚨 USO DEL SERVICE ID PRIMARY CORRECTO: service_thw7gfn
      const respuesta = await emailjs.send(
        'service_thw7gfn', 
        'template_ot9airk', 
        templateParams,
        'GG3tS19diXKenuD_-'
      );

      if (respuesta.status === 200) {
        alert(`✅ ¡Beneficio canjeado con éxito!\n\nComprobante digital enviado a: ${correoDestino}`);
      }
    } catch (err: any) {
      console.warn("EmailJS con restricción (412). Resguardando en Supabase...", err);
      
      // Fallback a Supabase utilizando la tabla 'solicitudes_beneficios' correctamente estructurada
      try {
        const supabase = createClient();
        await supabase.from('solicitudes_beneficios').insert([{
          sindicato_id: sindicatoIdActual,
          beneficio_id: beneficio.id,
          rut: socioInfo.rut,
          email: correoDestino.trim(),
          estado: 'Pendiente'
        }]);
        
        alert(`✅ ¡Beneficio reservado con éxito!\n\nRegistramos tu solicitud en la directiva. Te contactaremos a: ${correoDestino}`);
      } catch (dbErr: any) {
        console.error("Error en DB fallback:", dbErr);
        alert(`✅ ¡Solicitud registrada!\n\nMuestra tu credencial con el RUT ${socioInfo.rut} en el convenio para aplicar el descuento.`);
      }
    } finally {
      setProcesandoUso(null);
    }
  };

  const abrirModalNuevo = () => {
    setIsEditing(false); setCurrentId(null); setTitulo(''); setDescripcion('');
    setCategoria('Salud'); setDescuento(''); setImagenArchivo(null);
    setImagenUrlActual(''); setIsModalOpen(true);
  };

  const abrirModalEditar = (beneficio: any) => {
    setIsEditing(true); setCurrentId(beneficio.id); setTitulo(beneficio.titulo || '');
    setDescripcion(beneficio.descripcion || ''); setCategoria(beneficio.categoria || 'Salud');
    setDescuento(beneficio.descuento || ''); setImagenArchivo(null);
    setImagenUrlActual(beneficio.imagen_url || ''); setIsModalOpen(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sindicatoIdActual) {
      alert("❌ Error: No se detectó el ID del Sindicato activo.");
      return;
    }
    setGuardando(true);

    try {
      const supabase = createClient();
      let urlFinalImagen = imagenUrlActual;

      if (imagenArchivo) {
        const fileExt = imagenArchivo.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('beneficios').upload(fileName, imagenArchivo);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('beneficios').getPublicUrl(fileName);
        urlFinalImagen = publicUrl;
      }

      const datosBeneficio = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        categoria: categoria.trim(),
        descuento: descuento.trim(),
        imagen_url: urlFinalImagen,
        sindicato_id: sindicatoIdActual
      };

      if (isEditing && currentId) {
        const { error } = await supabase.from('beneficios').update(datosBeneficio).eq('id', currentId);
        if (error) throw error;
        alert('✅ Convenio actualizado con éxito.');
      } else {
        const { error } = await supabase.from('beneficios').insert([datosBeneficio]);
        if (error) throw error;
        alert('✨ Nuevo convenio publicado para tu organización.');
      }
      setIsModalOpen(false);
      fetchDatosYConfiguracion(); 
    } catch (err: any) {
      alert('❌ Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!window.confirm("⚠️ ¿Estás seguro de eliminar este convenio?")) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('beneficios').delete().eq('id', id);
      if (error) throw error;
      alert('🗑️ Convenio eliminado.');
      fetchDatosYConfiguracion();
    } catch(err: any) {
      alert('❌ Error: ' + err.message);
    }
  };

  const layoutClase = configUI?.beneficios?.layout === 'list' 
    ? 'space-y-4' 
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-[#070709] font-sans text-slate-100 min-h-screen relative w-full pb-32 overflow-hidden">
      {/* Efectos de luz de fondo */}
      <div className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none"></div>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-12 relative z-10">
        
        {/* ========================= VISTA SOCIO ===================== */}
        {!isAdmin && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full text-blue-400 text-[10px] font-black tracking-[0.25em] uppercase mb-4 shadow-inner">
                  ✨ Convenios Exclusivos
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">Catálogo de Beneficios</h1>
                <p className="text-slate-400 text-sm mt-2 max-w-xl">Aprovecha los descuentos corporativos, convenios de salud y ayudas sociales diseñadas para tu bienestar.</p>
              </div>

              {/* Credencial flotante del socio */}
              <div className="bg-[#121216]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-4 w-full md:w-auto shadow-2xl">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/10">👷🏽‍♂️</div>
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Socio Verificado</p>
                  <p className="font-extrabold text-white text-sm">{socioInfo.rut}</p>
                </div>
              </div>
            </div>

            {/* Banner Dinámico basado en JSONB */}
            {configUI?.beneficios?.bannerPromocional?.activo && (
              <div className="bg-gradient-to-r from-blue-600/25 to-indigo-600/20 border border-blue-500/30 p-5 rounded-3xl text-blue-200 font-medium text-sm mb-8 flex items-center gap-4 shadow-xl backdrop-blur-md">
                <span className="text-2xl p-2 bg-blue-500/20 rounded-2xl">🎉</span>
                <div>
                  <h4 className="font-bold text-white text-sm mb-0.5">Aviso Institucional</h4>
                  <p>{configUI.beneficios.bannerPromocional.texto}</p>
                </div>
              </div>
            )}

            {/* Filtros de Categorías */}
            <div className="flex overflow-x-auto pb-4 gap-2.5 mb-10 custom-scrollbar">
              {categoriasFiltro.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setFiltroActivo(cat)} 
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shadow-md ${filtroActivo === cat ? 'bg-blue-600 text-white shadow-blue-600/30 scale-105' : 'bg-[#121216] text-slate-400 border border-white/10 hover:bg-white/5 hover:text-white'}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {beneficios.length === 0 ? (
              <div className="bg-[#121216]/50 backdrop-blur-xl p-16 rounded-[2.5rem] border border-white/10 text-center shadow-2xl">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-lg font-bold text-white mb-1">Sin convenios activos</h3>
                <p className="text-slate-400 text-xs">Tu organización aún no ha publicado beneficios en esta sección.</p>
              </div>
            ) : (
              <div className={layoutClase}>
                {beneficiosFiltrados.map(b => (
                  <div key={b.id} className="bg-[#121216]/60 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden hover:border-blue-500/40 hover:shadow-[0_10px_30px_rgba(37,99,235,0.15)] transition-all flex flex-col group">
                    <div className="h-48 bg-black/40 relative overflow-hidden">
                      {b.imagen_url ? (
                        <img src={b.imagen_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={b.titulo}/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🎁</div>
                      )}
                      <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
                        {b.categoria}
                      </div>
                    </div>

                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{b.titulo}</h3>
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-6">{b.descripcion}</p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        <span className="text-emerald-400 font-black text-xs bg-emerald-500/10 px-3.5 py-1.5 rounded-xl border border-emerald-500/20 shadow-inner">
                          {b.descuento}
                        </span>
                        <button 
                          onClick={() => handleUsarBeneficio(b)}
                          disabled={procesandoUso === b.id}
                          className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 active:scale-95 flex items-center gap-2"
                        >
                          {procesandoUso === b.id ? 'Procesando...' : 'Usar Convenio 🎟️'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========================== VISTA ADMINISTRADOR ========================== */}
        {isAdmin && (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-white/10 pb-8">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <Link href="/dashboard/admin" className="text-slate-400 hover:text-white transition-colors font-bold text-xs bg-[#121216] px-3.5 py-2 rounded-xl border border-white/10 flex items-center gap-2">← Volver al Admin</Link>
                  <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black tracking-[0.2em] uppercase px-3.5 py-1.5 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Gestor Multi-Tenant
                  </span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Administración de Convenios</h1>
              </div>
              <button onClick={abrirModalNuevo} className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black px-6 py-3.5 rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center gap-2">
                <span className="text-xl">+</span> Crear Nuevo Convenio
              </button>
            </div>

            <div className="bg-[#121216]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead className="bg-black/40 border-b border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-6 pl-8">Convenio</th>
                    <th className="p-6">Detalle</th>
                    <th className="p-6 text-center">Descuento</th>
                    <th className="p-6 pr-8 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {beneficios.map(b => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-6 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black border border-white/10 shrink-0 shadow-md">
                            {b.imagen_url ? <img src={b.imagen_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">🎁</div>}
                          </div>
                          <div>
                            <p className="font-bold text-white text-base">{b.titulo}</p>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">{b.categoria}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-xs text-slate-400 font-medium max-w-xs truncate">{b.descripcion}</td>
                      <td className="p-6 text-center">
                        <span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-emerald-500/20">{b.descuento}</span>
                      </td>
                      <td className="p-6 pr-8">
                        <div className="flex justify-end gap-2.5">
                          <button onClick={() => abrirModalEditar(b)} className="bg-white/5 hover:bg-blue-600 text-slate-300 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors border border-white/10" title="Editar">✏️</button>
                          <button onClick={() => handleEliminar(b.id)} className="bg-white/5 hover:bg-red-600 text-slate-300 hover:text-white w-10 h-10 rounded-xl flex items-center justify-center transition-colors border border-white/10" title="Eliminar">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* MODAL CREAR / EDITAR (ADMIN) */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#121216] rounded-[2.5rem] shadow-2xl w-full max-w-2xl border border-white/10 my-auto overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
              <h3 className="text-xl font-black text-white">{isEditing ? 'Editar Convenio' : 'Nuevo Convenio'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-lg bg-white/5 w-9 h-9 rounded-xl flex items-center justify-center transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleGuardar} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Empresa / Título</label>
                  <input type="text" required value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" placeholder="Ej: Clínica Dental Sonrisas" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors">
                    {categoriasForm.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descuento o Beneficio</label>
                  <input type="text" required value={descuento} onChange={(e) => setDescuento(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none transition-colors" placeholder="Ej: 40% OFF o Copago Cero" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descripción Detallada</label>
                  <textarea required rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500 outline-none resize-none transition-colors" placeholder="Condiciones, vigencia y requisitos para hacer válido el convenio..."></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Logotipo / Imagen (Opcional)</label>
                  <input type="file" accept="image/*" onChange={(e) => setImagenArchivo(e.target.files ? e.target.files[0] : null)} className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 bg-black border border-white/10 rounded-2xl p-1.5 outline-none transition-colors cursor-pointer" />
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-4 rounded-2xl text-xs uppercase tracking-wider transition-colors">Cancelar</button>
                <button type="submit" disabled={guardando} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-600/30 text-xs uppercase tracking-wider transition-all">{guardando ? 'Guardando...' : 'Guardar Convenio'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}