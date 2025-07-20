import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import vitePrerender from "vite-plugin-prerender";


async function getDynamicRoutes() {
  try {
    const products = await fetch(`${process.env.VITE_API_URL}/api/products`).then(res => res.json());
    const services = await fetch(`${process.env.VITE_API_URL}/api/services`).then(res => res.json());

    const productRoutes = products.map(p => `/products/${p.id}`);
    const serviceRoutes = services.map(s => `/services/${s.id}`);

    return ['/', ...productRoutes, ...serviceRoutes];
  } catch (error) {
    console.error('Failed to fetch routes:', error);
    return ['/']; // fallback to only homepage prerender
  }
}


export default async () => {
  const routes = await getDynamicRoutes();

  return defineConfig({
    plugins: [
      react(),
      vitePrerender({
        routes,
        staticDir: 'public',
      }),
    ],
    build: {
      outDir: 'dist',
    },
    server: {
      historyApiFallback: true,
      proxy: {
        '/api': process.env.VITE_API_URL || 'http://localhost:5000', 
      },
    },
  });
};
