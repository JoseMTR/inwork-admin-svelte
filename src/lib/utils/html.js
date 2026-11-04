// HTML de las celdas de las DataTables.
// Usa las mismas clases que los componentes Avatar y StatusPill para que se vean iguales.
import { escapar, iniciales, tonoAvatar, tonoEstado, textoEstado, moneda } from './formato.js';

export function avatar(nombre, tamano = 'chico') {
	return `<span class="avatar avatar-${tamano} avatar-${tonoAvatar(nombre)}">${escapar(iniciales(nombre))}</span>`;
}

export function persona(nombre, detalle = '', tamano = 'chico') {
	return `<div class="celda-persona">${avatar(nombre, tamano)}<div><strong>${escapar(nombre)}</strong>${
		detalle ? `<small>${escapar(detalle)}</small>` : ''
	}</div></div>`;
}

export function pill(estado, texto) {
	return `<span class="pill pill-${tonoEstado(estado)}">${escapar(texto ?? textoEstado(estado))}</span>`;
}

export function chip(texto, icono = '') {
	return `<span class="chip">${icono ? `<span class="material-symbols-rounded">${icono}</span>` : ''}${escapar(texto)}</span>`;
}

export function estrellas(puntos) {
	let html = `<span class="estrellas" aria-label="${puntos} de 5 estrellas">`;
	for (let i = 1; i <= 5; i++) {
		html += `<span class="material-symbols-rounded${i > puntos ? ' apagada' : ''}">star</span>`;
	}
	return html + '</span>';
}

export function notaEstrella(valor) {
	if (!Number(valor)) return '<span class="texto-3">Sin reseñas</span>';
	return `<span class="nota-estrella"><span class="material-symbols-rounded">star</span>${Number(valor).toFixed(1)}</span>`;
}

export function titulo(texto, detalle = '') {
	return `<strong class="bloque-texto">${escapar(texto)}</strong>${detalle ? `<small class="texto-3">${escapar(detalle)}</small>` : ''}`;
}

export function dinero(valor) {
	return `<span class="numero fuerte">${moneda(valor)}</span>`;
}

export function suave(texto, clase = 'texto-2') {
	return `<span class="${clase}">${escapar(texto)}</span>`;
}

export function recortado(texto) {
	return `<span class="recortar texto-2" title="${escapar(texto)}">${escapar(texto)}</span>`;
}

export function codigo(texto) {
	return `<code class="codigo">${escapar(texto)}</code>`;
}
