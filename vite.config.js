// adapter-static: genera un sitio estático (carpeta build) para publicarlo en Render como Static Site.
// fallback 200.html: como el panel no usa SSR, todas las rutas (/inicio, /usuarios...) se abren desde ese archivo.
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter({ fallback: '200.html' })
		})
	]
});
