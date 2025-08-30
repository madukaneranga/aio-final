import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import vitePrerender from "vite-plugin-prerender";
const dotenv = require("dotenv");
dotenv.config();

async function getDynamicRoutes() {
  try {
    const products = await fetch(`${process.env.VITE_API_URL}/api/products`).then((res) =>
      res.json()
    );
    const services = await fetch(`${process.env.VITE_API_URL}/api/services`).then((res) =>
      res.json()
    );

    const productRoutes = products.filter((p) => p.id).map((p) => `/products/${p.id}`);
    const serviceRoutes = services.filter((s) => s.id).map((s) => `/services/${s.id}`);

    return ["/", ...productRoutes, ...serviceRoutes];
  } catch (error) {
    console.error("Failed to fetch routes:", error);
    return ["/"]; // fallback to homepage only
  }
}

export default async () => {
  const routes = await getDynamicRoutes();

  return defineConfig({
    plugins: [
      react(),
      vitePrerender({
        routes,
        staticDir: path.resolve(__dirname, "dist"), // ✅ use absolute path to dist
      }),
    ],
    build: {
      outDir: "dist",
    },
    server: {
      proxy: {
        "/api": process.env.VITE_API_URL || "http://localhost:10000",
      },
    },
  });
};
