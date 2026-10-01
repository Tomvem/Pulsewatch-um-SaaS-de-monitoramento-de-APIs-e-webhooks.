import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111a1e",
        canvas: "#f5f7f6",
        lime: "#c7f464",
        teal: "#087e6b",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(17, 26, 30, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
