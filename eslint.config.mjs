import eslint from '@eslint/js';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    ignores: ['**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: './tsconfig.spec.json',
        tsconfigRootDir: import.meta.dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'off',
    },
  },
  // Domain layer isolation: src/domain must NOT import frameworks or outer layers.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@nestjs/*', '@nestjs/**'],
              message:
                'Domain layer must not import NestJS. Move framework concerns to application/infrastructure.',
            },
            {
              group: [
                '@prisma/*',
                '@prisma/**',
                '@/generated/prisma',
                '@/generated/prisma/**',
              ],
              message:
                'Domain layer must not import Prisma. Use mappers at the infrastructure boundary.',
            },
            {
              group: ['typeorm', 'typeorm/**'],
              message:
                'TypeORM is removed from this project. If you see this, you imported a stale dep.',
            },
            {
              group: ['class-validator', 'class-transformer'],
              message:
                'Domain layer must not use HTTP validation decorators. Keep entities pure; validate at presentation boundary.',
            },
            {
              group: ['@/infrastructure/*', '@/infrastructure/**'],
              message:
                'Domain layer must not import from infrastructure. Dependency arrow points inward (infra → domain).',
            },
            {
              group: ['@/presentation/*', '@/presentation/**'],
              message: 'Domain layer must not import from presentation.',
            },
            {
              group: ['@/application/*', '@/application/**'],
              message:
                'Domain layer must not import from application. Application depends on domain, not the reverse.',
            },
            {
              group: ['@/composition/*', '@/composition/**'],
              message:
                'Domain layer must not import from composition. Composition is the outermost layer.',
            },
          ],
        },
      ],
    },
  },
  // Application layer isolation: composition modules are deliberately outside this tree.
  {
    files: ['src/application/**/*.ts'],
    ignores: ['src/application/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@prisma/*',
                '@prisma/**',
                '@/generated/prisma',
                '@/generated/prisma/**',
              ],
              message:
                'Application layer must not import Prisma. Depend on ports; Prisma lives in infrastructure.',
            },
            {
              group: ['typeorm', 'typeorm/**'],
              message: 'TypeORM is removed from this project.',
            },
            {
              group: ['@/infrastructure/*', '@/infrastructure/**'],
              message:
                'Application layer must not import from infrastructure. Depend on ports instead.',
            },
            {
              group: ['@/presentation/*', '@/presentation/**'],
              message: 'Application layer must not import from presentation.',
            },
            {
              group: ['@/composition/*', '@/composition/**'],
              message: 'Application layer must not import from composition.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.mjs',
      'docs/.vuepress/**/*',
      'src/generated/**/*',
      'dist/**/*',
      'node_modules/**/*',
    ],
  },
  prettierRecommended,
];
