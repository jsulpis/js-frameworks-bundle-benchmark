import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  publicDir: "dist", // does not seem to work
  server: {
    prerender: {
      routes: ["/"],
      output: { publicDir: "dist" }, // neither here
    },
  },
});
