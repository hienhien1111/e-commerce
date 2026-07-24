import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const sourceRoot = join(process.cwd(), 'src');

const filesBelow = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory()
      ? filesBelow(path)
      : path.endsWith('.ts') && !path.endsWith('.spec.ts')
        ? [path]
        : [];
  });

const importsOf = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  return [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
    (match) => match[1],
  );
};

describe('architecture dependency boundaries', () => {
  it('keeps domain independent from frameworks and outer layers', () => {
    const forbidden = [
      '@nestjs/',
      '@prisma/',
      '@/generated/',
      '@/application/',
      '@/infrastructure/',
      '@/presentation/',
      '@/composition/',
    ];
    const violations = filesBelow(join(sourceRoot, 'domain')).flatMap((file) =>
      importsOf(file)
        .filter((dependency) =>
          forbidden.some((prefix) => dependency.startsWith(prefix)),
        )
        .map((dependency) => `${relative(sourceRoot, file)} -> ${dependency}`),
    );
    expect(violations).toEqual([]);
  });

  it('keeps application independent from adapters and composition', () => {
    const forbidden = [
      '@prisma/',
      '@/generated/',
      '@/infrastructure/',
      '@/presentation/',
      '@/composition/',
    ];
    const violations = filesBelow(join(sourceRoot, 'application')).flatMap(
      (file) =>
        importsOf(file)
          .filter((dependency) =>
            forbidden.some((prefix) => dependency.startsWith(prefix)),
          )
          .map(
            (dependency) => `${relative(sourceRoot, file)} -> ${dependency}`,
          ),
    );
    expect(violations).toEqual([]);
  });

  it('keeps HTTP controllers behind command/query buses', () => {
    const violations = filesBelow(
      join(sourceRoot, 'presentation', 'http', 'controllers'),
    ).flatMap((file) =>
      importsOf(file)
        .filter(
          (dependency) =>
            dependency.includes('/repositories/') ||
            dependency.includes('.repository.port'),
        )
        .map((dependency) => `${relative(sourceRoot, file)} -> ${dependency}`),
    );
    expect(violations).toEqual([]);
  });
});
