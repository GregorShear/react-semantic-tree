import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/", "example/dist/", "node_modules/"] },

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ["**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
  },

  {
    // `withBranch` forwards a wrapped component's generic props and `ref`,
    // which cannot be typed without `any` at the forwardRef boundary.
    files: ["src/Branch.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    // Config files are linted for obvious errors but sit outside the app's
    // tsconfig project, so type-aware rules cannot run on them.
    files: ["**/*.config.{js,mjs,cjs,ts,mts,cts}", "eslint.config.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  prettier,
);
