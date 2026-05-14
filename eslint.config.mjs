import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      ".agents/**",
      "next-env.d.ts",
      "e2e/**"
    ]
  },
  ...nextVitals,
  ...nextTypescript
];

export default eslintConfig;
