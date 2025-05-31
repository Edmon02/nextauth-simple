# Database Management Guide

This guide explains how to manage database changes in this project. We use PostgreSQL as our database and Drizzle ORM for database operations.

## Prerequisites

1. PostgreSQL installed on your machine:
```bash
brew install postgresql@14
```

## Managing Database Service

1. Start PostgreSQL service:
```bash
brew services start postgresql@14
```

2. Check service status:
```bash
brew services list | grep postgresql
```

3. Stop PostgreSQL service:
```bash
brew services stop postgresql@14
```

4. Restart PostgreSQL service:
```bash
brew services restart postgresql@14
```

## Database Setup (First Time Only)

1. Create the database:
```bash
createdb nextauth_simple
```

2. Create the postgres user:
```bash
psql postgres -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';"
```

## Making Database Changes

When you need to make changes to the database schema, follow these steps:

1. Edit the schema file at `packages/nextauth-simple/src/db/schema.ts`
   - Add new tables using `pgTable`
   - Modify existing tables
   - Add relations between tables

2. Make sure all dependencies are up to date:
```bash
bun add -D drizzle-kit
bun add drizzle-orm@latest
```

3. Push the schema changes to the database:
```bash
bunx drizzle-kit push
```

## Common Issues

1. If you get connection errors:
   - Make sure PostgreSQL is running: `brew services list | grep postgresql`
   - If not running, start it: `brew services start postgresql@14`

2. If you get authentication errors:
   - Check your database credentials in `drizzle.config.ts`
   - Verify the postgres user exists: `psql postgres -c "\du"`

## Database Configuration

The database configuration is in `drizzle.config.ts`:
```typescript
export default {
  schema: './packages/nextauth-simple/src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'nextauth_simple',
  },
}
```

## Best Practices

1. Always back up your database before making schema changes
2. Test schema changes in a development environment first
3. Keep track of all schema changes in version control
4. Use meaningful names for tables and columns
5. Add comments in the schema file to document complex relationships or business rules

## Example: Adding a New Table

Here's an example of how to add a new table:

1. Edit `packages/nextauth-simple/src/db/schema.ts`:
```typescript
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// Add relations
export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

2. Push the changes:
```bash
bunx drizzle-kit push
```
