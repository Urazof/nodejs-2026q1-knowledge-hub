import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      login: 'seed_admin',
      password: 'seed_admin_password',
      role: 'ADMIN',
    },
  });

  const editor = await prisma.user.create({
    data: {
      login: 'seed_editor',
      password: 'seed_editor_password',
      role: 'EDITOR',
    },
  });

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Backend',
        description: 'Backend development articles',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Frontend',
        description: 'Frontend engineering practices',
      },
    }),
    prisma.category.create({
      data: {
        name: 'DevOps',
        description: 'CI/CD and infrastructure guides',
      },
    }),
  ]);

  const tagNames = ['nodejs', 'typescript', 'nestjs', 'prisma', 'docker'];
  await Promise.all(
    tagNames.map((name) =>
      prisma.tag.create({
        data: { name },
      }),
    ),
  );

  const articles = await Promise.all([
    prisma.article.create({
      data: {
        title: 'Nest Basics',
        content: 'Controller and service fundamentals.',
        status: 'DRAFT',
        authorId: admin.id,
        categoryId: categories[0].id,
        tags: {
          connect: [{ name: 'nestjs' }, { name: 'typescript' }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Prisma in Production',
        content: 'Schema, migration, and query patterns.',
        status: 'PUBLISHED',
        authorId: editor.id,
        categoryId: categories[0].id,
        tags: {
          connect: [{ name: 'prisma' }, { name: 'nodejs' }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Docker Compose Tips',
        content: 'Healthchecks, profiles, and volumes.',
        status: 'PUBLISHED',
        authorId: admin.id,
        categoryId: categories[2].id,
        tags: {
          connect: [{ name: 'docker' }, { name: 'nodejs' }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'Frontend Architecture',
        content: 'Modular UI and state boundaries.',
        status: 'ARCHIVED',
        authorId: editor.id,
        categoryId: categories[1].id,
        tags: {
          connect: [{ name: 'typescript' }],
        },
      },
    }),
    prisma.article.create({
      data: {
        title: 'API Performance',
        content: 'Avoiding N+1 and over-fetching.',
        status: 'DRAFT',
        authorId: null,
        categoryId: categories[0].id,
        tags: {
          connect: [{ name: 'nodejs' }, { name: 'prisma' }],
        },
      },
    }),
  ]);

  await Promise.all([
    prisma.comment.create({
      data: {
        content: 'Very useful walkthrough.',
        articleId: articles[1].id,
        authorId: admin.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Please add more examples.',
        articleId: articles[0].id,
        authorId: editor.id,
      },
    }),
    prisma.comment.create({
      data: {
        content: 'Saved for later.',
        articleId: articles[2].id,
        authorId: null,
      },
    }),
  ]);
}

main()
  .catch((error: unknown) => {
    // Keep explicit logging for CI seed diagnostics.
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
