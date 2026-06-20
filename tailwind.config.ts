// tailwind.config.ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          dark: "#000000",
          surface: "#0A0A0A",
          gold: "#FFFFFF",
        },
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.08)",
      },
    },
  },
  plugins: [],
}

export default config
