import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#12243A",
          sky: "#CFE4F1",
          sand: "#F4E7CC",
          clay: "#D56F3E",
          moss: "#5D7F5B"
        }
      },
      boxShadow: {
        shell: "0 18px 50px rgba(18, 36, 58, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;

