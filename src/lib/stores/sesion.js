import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const CLAVE_SESION = 'inwork_sesion';
const CLAVE_MODULOS = 'inwork_modulos';

// Solo estos roles pueden entrar al panel de administración
export const ROLES_PANEL = [1, 2, 3];

function leer(clave, porDefecto) {
	if (!browser) return porDefecto;
	try {
		const texto = localStorage.getItem(clave) ?? sessionStorage.getItem(clave);
		return texto ? JSON.parse(texto) : porDefecto;
	} catch {
		return porDefecto;
	}
}

function recordarEnLocal() {
	try {
		return localStorage.getItem('inwork_recordar') !== 'no';
	} catch {
		return true;
	}
}

function guardar(clave, valor) {
	if (!browser) return;
	try {
		localStorage.removeItem(clave);
		sessionStorage.removeItem(clave);
		if (valor === null) return;
		const almacen = recordarEnLocal() ? localStorage : sessionStorage;
		almacen.setItem(clave, JSON.stringify(valor));
	} catch {
		// Si el navegador no deja guardar, la sesión dura mientras la pestaña esté abierta
	}
}

export const sesion = writable(leer(CLAVE_SESION, null));
export const modulos = writable(leer(CLAVE_MODULOS, []));

sesion.subscribe((valor) => guardar(CLAVE_SESION, valor));
modulos.subscribe((valor) => guardar(CLAVE_MODULOS, valor && valor.length ? valor : null));

export function guardarSesion(datos, recordar = true) {
	if (browser) {
		try {
			localStorage.setItem('inwork_recordar', recordar ? 'si' : 'no');
		} catch {
			/* nada */
		}
	}
	sesion.set({
		token: datos.access_token,
		id_usuario: datos.id_usuario,
		nombre: datos.nombre,
		id_rol: datos.id_rol,
		rol: datos.rol,
		inicio: new Date().toISOString()
	});
}

export function cerrarSesion() {
	sesion.set(null);
	modulos.set([]);
}

// Lee la fecha de vencimiento que trae el JWT
export function tokenVencido(token) {
	try {
		const datos = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
		return !datos.exp || datos.exp * 1000 < Date.now();
	} catch {
		return true;
	}
}

// permiso('usuarios', 'editar') -> true / false, según la tabla rol_modulo
export const permiso = derived([sesion, modulos], ([$sesion, $modulos]) => {
	return (modulo, accion = 'leer') => {
		if (!$sesion) return false;
		if ($sesion.id_rol === 1) return true; // el administrador puede todo
		const fila = ($modulos || []).find((m) => m.nombre === modulo);
		return !!fila && !!fila['puede_' + accion];
	};
});
