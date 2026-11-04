// Funciones pequeñas para mostrar datos bonitos en pantalla (sin mostrar IDs).

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function moneda(valor) {
	return '$ ' + Math.round(Number(valor) || 0).toLocaleString('es-CO');
}

// 48900000 -> "$ 48,9 M"
export function millones(valor) {
	const v = Number(valor) || 0;
	if (Math.abs(v) >= 1000000) {
		return '$ ' + (v / 1000000).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';
	}
	return moneda(v);
}

export function numero(valor) {
	return (Number(valor) || 0).toLocaleString('es-CO');
}

export function porcentaje(parte, total, decimales = 0) {
	if (!total) return '0%';
	return ((parte / total) * 100).toLocaleString('es-CO', { maximumFractionDigits: decimales }) + '%';
}

// Convierte "2026-11-20", "2026-11-20T08:00:00" o un Date en un objeto Date (hora local)
export function aFecha(valor) {
	if (!valor) return null;
	if (valor instanceof Date) return valor;
	const texto = String(valor);
	if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
		const [a, m, d] = texto.split('-').map(Number);
		return new Date(a, m - 1, d);
	}
	const f = new Date(texto);
	return isNaN(f) ? null : f;
}

// "14 oct 2026"
export function fecha(valor) {
	const f = aFecha(valor);
	if (!f) return '—';
	return `${f.getDate()} ${MESES[f.getMonth()]} ${f.getFullYear()}`;
}

// "8:40 a. m."
export function horaDe(valor) {
	const f = aFecha(valor);
	if (!f) return '';
	let h = f.getHours();
	const m = String(f.getMinutes()).padStart(2, '0');
	const sufijo = h < 12 ? 'a. m.' : 'p. m.';
	h = h % 12 || 12;
	return `${h}:${m} ${sufijo}`;
}

// "14 oct 2026, 8:40 a. m."
export function fechaHora(valor) {
	const f = aFecha(valor);
	if (!f) return '—';
	return `${fecha(f)}, ${horaDe(f)}`;
}

// "08:00:00" -> "8:00 a. m."
export function hora(texto) {
	if (!texto) return '';
	const [h, m] = String(texto).split(':').map(Number);
	const sufijo = h < 12 ? 'a. m.' : 'p. m.';
	return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${sufijo}`;
}

// Hace cuánto: "hace 3 días"
export function haceCuanto(valor) {
	const f = aFecha(valor);
	if (!f) return '';
	const minutos = Math.round((Date.now() - f.getTime()) / 60000);
	if (minutos < 1) return 'ahora';
	if (minutos < 60) return `hace ${minutos} min`;
	const horas = Math.round(minutos / 60);
	if (horas < 24) return `hace ${horas} h`;
	const dias = Math.round(horas / 24);
	if (dias < 30) return `hace ${dias} día${dias === 1 ? '' : 's'}`;
	return fecha(f);
}

// Para ordenar fechas en las tablas
export function ordenFecha(valor) {
	const f = aFecha(valor);
	return f ? f.getTime() : 0;
}

export function iniciales(nombre = '') {
	const partes = String(nombre).trim().split(' ').filter((p) => p.length > 0);
	const primera = partes.length > 0 ? partes[0].charAt(0) : '';
	const segunda = partes.length > 1 ? partes[1].charAt(0) : '';
	return (primera + segunda).toUpperCase() || '?';
}

export function tonoAvatar(nombre = '') {
	const tonos = ['naranja', 'azul', 'verde', 'morado', 'ambar'];
	let suma = 0;
	for (const letra of String(nombre)) suma += letra.charCodeAt(0);
	return tonos[suma % tonos.length];
}

export function tonoEstado(estado) {
	switch (estado) {
		case 'activo':
		case 'activa':
		case 'aceptada':
		case 'aprobada':
		case 'finalizado':
		case 'finalizada':
		case 'liberado':
		case 'resuelto':
		case 'leida':
		case 'usado':
		case 'verificado':
			return 'verde';
		case 'publicado':
		case 'en_revision':
		case 'asegurado':
		case 'INSERT':
		case 'deposito':
			return 'azul';
		case 'asignado':
		case 'UPDATE':
		case 'comision':
		case 'retirada':
			return 'morado';
		case 'pendiente':
		case 'pendiente_pago':
		case 'sin_leer':
		case 'vigente':
			return 'ambar';
		case 'cancelado':
		case 'cancelada':
		case 'rechazada':
		case 'rechazado':
		case 'en_disputa':
		case 'reembolsado':
		case 'reembolso':
		case 'inactivo':
		case 'vencido':
		case 'DELETE':
			return 'rojo';
		default:
			return 'gris';
	}
}

const TEXTOS_ESTADO = {
	en_revision: 'En revisión',
	pendiente_pago: 'Pendiente de pago',
	en_disputa: 'En disputa',
	sin_leer: 'Sin leer',
	leida: 'Leída',
	deposito: 'Depósito',
	liberacion: 'Pago al trabajador',
	comision: 'Comisión',
	reembolso: 'Reembolso',
	INSERT: 'Creó',
	UPDATE: 'Editó',
	DELETE: 'Eliminó'
};

export function textoEstado(estado = '') {
	if (TEXTOS_ESTADO[estado]) return TEXTOS_ESTADO[estado];
	const limpio = String(estado).replaceAll('_', ' ');
	return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export function capitalizar(texto = '') {
	const limpio = String(texto).replaceAll('_', ' ');
	return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export function escapar(texto) {
	return String(texto ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

// cantidad(1, 'oferta') -> "1 oferta" · cantidad(3, 'oferta') -> "3 ofertas"
export function cantidad(n, singular, plural = singular + 's') {
	return `${n} ${Number(n) === 1 ? singular : plural}`;
}

export function nombreCompleto(usuario) {
	if (!usuario) return 'Usuario no disponible';
	return `${usuario.nombre} ${usuario.apellido}`.trim();
}

// Lista -> Map por un campo (para buscar nombres a partir de los ids que devuelve la API)
export function mapaPor(lista = [], campo) {
	const mapa = new Map();
	for (const item of lista) mapa.set(item[campo], item);
	return mapa;
}

// Cuenta cuántos hay de cada grupo: [{ etiqueta, valor }] de mayor a menor
export function contarPor(lista = [], obtener) {
	const cuenta = new Map();
	for (const item of lista) {
		const clave = obtener(item);
		if (clave === undefined || clave === null || clave === '') continue;
		cuenta.set(clave, (cuenta.get(clave) || 0) + 1);
	}
	return [...cuenta.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor);
}

export function sumar(lista = [], obtener) {
	return lista.reduce((suma, item) => suma + (Number(obtener(item)) || 0), 0);
}

export function promedio(lista = [], obtener) {
	if (lista.length === 0) return 0;
	return sumar(lista, obtener) / lista.length;
}

export function decimal(valor, digitos = 1) {
	return (Number(valor) || 0).toLocaleString('es-CO', { minimumFractionDigits: digitos, maximumFractionDigits: digitos });
}

// Fecha de hoy para inputs type="date": "2026-11-02"
export function hoyISO() {
	const f = new Date();
	return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}

// Semana del año simplificada para agrupar: "3 nov"
export function inicioSemana(valor) {
	const f = aFecha(valor);
	if (!f) return null;
	const lunes = new Date(f);
	const dia = (f.getDay() + 6) % 7;
	lunes.setDate(f.getDate() - dia);
	lunes.setHours(0, 0, 0, 0);
	return lunes;
}

export function etiquetaSemana(lunes) {
	return `${lunes.getDate()} ${MESES[lunes.getMonth()]}`;
}

// Descarga una lista como archivo CSV (se abre en Excel)
export function descargarCSV(nombreArchivo, columnas, filas) {
	const linea = (valores) => valores.map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(';');
	const contenido = [linea(columnas.map((c) => c.titulo)), ...filas.map((f) => linea(columnas.map((c) => c.valor(f))))].join('\r\n');
	const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const enlace = document.createElement('a');
	enlace.href = url;
	enlace.download = nombreArchivo;
	enlace.click();
	URL.revokeObjectURL(url);
}
