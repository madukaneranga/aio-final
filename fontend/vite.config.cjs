const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");
const vitePrerender = require("vite-plugin-prerender");
const dotenv = require("dotenv");
dotenv.config();

async function getDynamicRoutes() {
  try {
    const response = await fetch(`${process.env.VITE_API_URL}/api/products`).then((res) =>
      res.json()
    );

    // Handle the new response format from our MVC refactoring
    const products = response.data || response;

    // Check if products is an array before using filter
    if (Array.isArray(products)) {
      const productRoutes = products.filter((p) => p.id || p._id).map((p) => `/products/${p.id || p._id}`);
      return ["/", ...productRoutes];
    } else {
      console.warn("Products response is not an array:", products);
      return ["/"]; // fallback to homepage only
    }
  } catch (error) {
    console.error("Failed to fetch routes:", error);
    return ["/"]; // fallback to homepage only
  }
}

module.exports = async () => {
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
