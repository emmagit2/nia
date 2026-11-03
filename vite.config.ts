import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes("@clerk/clerk-react")) return "clerk";
          if (id.includes("@supabase/supabase-js")) return "supabase";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
