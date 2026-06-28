import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    server: { port: 5173 },
    // Ensure a single React instance so deps that bundle their own (e.g. the
    // dev-only agentation toolbar) don't trigger "Invalid hook call".
    resolve: { dedupe: ["react", "react-dom"] },
});
