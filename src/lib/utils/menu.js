// El menú se arma SOLO con los módulos que devuelve la base de datos (tabla rol_modulo)
// en GET /auth/mis-modulos. Aquí solo se elige el ícono, el texto bonito y el grupo de cada módulo.

export const GRUPOS = [
	{ titulo: 'General', color: 'var(--naranja)' },
	{ titulo: 'Personas', color: 'var(--azul)' },
	{ titulo: 'Marketplace', color: 'var(--verde)' },
	{ titulo: 'Finanzas', color: 'var(--morado)' },
	{ titulo: 'Moderación', color: '#b8560f' },
	{ titulo: 'Catálogos', color: '#0e8a8a' },
	{ titulo: 'Sistema', color: '#475569' }
];

export const MODULOS = {
	informes: { texto: 'Informes e IA', icono: 'auto_awesome', grupo: 'General' },
	usuarios: { texto: 'Usuarios', icono: 'group', grupo: 'Personas' },
	verificaciones: { texto: 'Verificación de identidad', icono: 'badge', grupo: 'Personas' },
	calificaciones: { texto: 'Calificaciones', icono: 'star_rate', grupo: 'Personas' },
	trabajos: { texto: 'Trabajos y mapa', icono: 'work', grupo: 'Marketplace' },
	ofertas: { texto: 'Ofertas', icono: 'local_offer', grupo: 'Marketplace' },
	contrataciones: { texto: 'Contrataciones', icono: 'handshake', grupo: 'Marketplace' },
	pagos: { texto: 'Pagos y custodias', icono: 'payments', grupo: 'Finanzas' },
	reportes: { texto: 'Reportes', icono: 'flag', grupo: 'Moderación' },
	chat: { texto: 'Chats y mensajes', icono: 'forum', grupo: 'Moderación' },
	notificaciones: { texto: 'Notificaciones', icono: 'notifications', grupo: 'Moderación' },
	adjuntos: { texto: 'Archivos adjuntos', icono: 'attach_file', grupo: 'Moderación' },
	ubicacion: { texto: 'Países y ciudades', icono: 'public', grupo: 'Catálogos' },
	categorias: { texto: 'Categorías y habilidades', icono: 'category', grupo: 'Catálogos' },
	roles: { texto: 'Roles y permisos', icono: 'admin_panel_settings', grupo: 'Sistema' },
	seguridad: { texto: 'Seguridad', icono: 'key', grupo: 'Sistema' },
	auditoria: { texto: 'Auditoría', icono: 'history', grupo: 'Sistema' }
};

// Datos para mostrar un módulo (si la BD trae uno nuevo que no está aquí, igual sale en el menú)
export function infoModulo(modulo) {
	const conocido = MODULOS[modulo.nombre];
	return {
		texto: conocido?.texto ?? modulo.descripcion ?? modulo.nombre,
		icono: conocido?.icono ?? 'extension',
		grupo: conocido?.grupo ?? 'Sistema',
		ruta: modulo.ruta || '/' + modulo.nombre,
		nombre: modulo.nombre
	};
}

// [{ titulo, color, items: [{ texto, icono, ruta, nombre }] }]
export function construirMenu(modulos = []) {
	const grupos = GRUPOS.map((g) => ({ ...g, items: [] }));
	grupos[0].items.push({ texto: 'Inicio', icono: 'space_dashboard', ruta: '/inicio', nombre: 'inicio' });

	for (const modulo of modulos) {
		if (!modulo.puede_leer) continue;
		const info = infoModulo(modulo);
		const grupo = grupos.find((g) => g.titulo === info.grupo) ?? grupos[grupos.length - 1];
		grupo.items.push(info);
	}

	grupos[grupos.length - 1].items.push({ texto: 'Mi perfil', icono: 'account_circle', ruta: '/perfil', nombre: 'perfil' });
	return grupos.filter((g) => g.items.length > 0);
}

export const ICONOS_ROL = {
	1: 'admin_panel_settings',
	2: 'shield_person',
	3: 'monitoring',
	4: 'storefront',
	5: 'construction'
};
