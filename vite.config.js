import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/shopify-api": {
        target: "https://tienda-gusbauer.myshopify.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/shopify-api/, ""),
      },
    },
  },
});
