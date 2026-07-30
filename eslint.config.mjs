import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: currentDirectory });

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "outputs/**",
      "backups/**",
      "public/covers/**",
      "data/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // Các ảnh này có nguồn động hoặc cơ chế fallback runtime riêng nên không đi qua next/image.
    files: [
      "app/profile/page.tsx",
      "components/Navbar.tsx",
      "components/shared/BookCover.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];
