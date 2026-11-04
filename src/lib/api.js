
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { sesion, cerrarSesion } from './stores/sesion.js';
import { API_PRINCIPAL, API_PAGOS } from './config.js';

export class ErrorApi extends Error {
	constructor(mensaje, estado) {
		super(mensaje);
		this.estado = estado;
	}
}

function mensajeDeError(json, estado) {
	if (json) {
		if (typeof json.detail === 'string') return json.detail;
		if (Array.isArray(json.detail)) {
			return json.detail.map((d) => `${(d.loc || []).slice(-1)[0] ?? ''}: ${d.msg}`).join('. ');
		}
		if (json.mensaje) return json.mensaje;
	}
	if (estado === 403) return 'Tu rol no tiene permiso para hacer esto';
	if (estado === 404) return 'No se encontró el registro';
	return `Error ${estado} en el servidor`;
}

async function pedir(url, { metodo = 'GET', datos, conToken = true } = {}) {
	const encabezados = {};
	const actual = get(sesion);
	if (conToken && actual?.token) encabezados.Authorization = 'Bearer ' + actual.token;
	if (datos !== undefined) encabezados['Content-Type'] = 'application/json';

	let respuesta;
	try {
		respuesta = await fetch(url, {
			method: metodo,
			headers: encabezados,
			body: datos !== undefined ? JSON.stringify(datos) : undefined
		});
	} catch {
		throw new ErrorApi('No se pudo conectar con el servidor. Si la API estaba dormida en Render, espera unos segundos y vuelve a intentar.', 0);
	}

	let json = null;
	try {
		json = await respuesta.json();
	} catch {
		json = null;
	}

	if (!respuesta.ok) {
		if (respuesta.status === 401 && conToken && actual?.token) {
			cerrarSesion();
			goto('/?sesion=expirada');
		}
		throw new ErrorApi(mensajeDeError(json, respuesta.status), respuesta.status);
	}
	return json;
}

const memoria = new Map();

export function limpiarMemoria() {
	memoria.clear();
}

function leer(url) {
	if (memoria.has(url)) return memoria.get(url);
	const promesa = pedir(url).catch((error) => {
		memoria.delete(url);
		throw error;
	});
	memoria.set(url, promesa);
	setTimeout(() => memoria.delete(url), 30000);
	return promesa;
}

async function cambiar(url, metodo, datos) {
	const respuesta = await pedir(url, { metodo, datos });
	limpiarMemoria();
	return respuesta;
}

function cliente(base) {
	return {
		get: (ruta) => leer(base + ruta),
		post: (ruta, datos = {}) => cambiar(base + ruta, 'POST', datos),
		put: (ruta, datos = {}) => cambiar(base + ruta, 'PUT', datos),
		del: (ruta) => cambiar(base + ruta, 'DELETE')
	};
}

export const api = cliente(API_PRINCIPAL);
export const pagosApi = cliente(API_PAGOS + '/api');

export function iniciarSesion(correo, password) {
	return pedir(API_PRINCIPAL + '/auth/login', { metodo: 'POST', datos: { correo, password }, conToken: false });
}

export async function estadoApis() {
	const probar = async (url) => {
		try {
			const r = await fetch(url);
			return r.ok;
		} catch {
			return false;
		}
	};
	const [principal, pagos] = await Promise.all([probar(API_PRINCIPAL + '/'), probar(API_PAGOS + '/')]);
	return { principal, pagos };
}

export async function cargarVarios(pedidos) {
	const claves = Object.keys(pedidos);
	const resultados = await Promise.allSettled(claves.map((c) => pedidos[c]));
	const datos = {};
	const errores = [];
	claves.forEach((clave, i) => {
		if (resultados[i].status === 'fulfilled') {
			datos[clave] = resultados[i].value ?? [];
		} else {
			datos[clave] = [];
			errores.push(resultados[i].reason);
		}
	});
	return { datos, errores };
}
