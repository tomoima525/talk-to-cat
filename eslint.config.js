import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      // Allow Three.js/R3F JSX properties
      "react/no-unknown-property": [
        "error",
        {
          ignore: [
            "args",
            "position",
            "rotation",
            "scale",
            "intensity",
            "color",
            "flatShading",
            "metalness",
            "roughness",
            "geometry",
            "material",
            "castShadow",
            "receiveShadow",
            "dispose",
            "attach",
            "object",
          ],
        },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  eslintConfigPrettier,
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  }
);
