# NextAuth Simple

A minimal, highly opinionated authentication library for Next.js App Router.

## Features

- Built specifically for Next.js App Router
- Simple credential-based authentication
- PostgreSQL database support with Drizzle ORM
- TypeScript support
- Zero configuration required
- Lightweight and fast

## Installation

```bash
npm install nextauth-simple
# or
yarn add nextauth-simple
# or
pnpm add nextauth-simple
# or
bun add nextauth-simple
```

## Quick Start

1. Setup your database configuration:

```typescript
// drizzle.config.ts
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'your_database',
  },
};
```

2. Initialize the auth configuration:

```typescript
// lib/auth.ts
import { createAuth } from 'nextauth-simple';

export const { login, logout, register, getSession } = createAuth({
  databaseUrl: process.env.DATABASE_URL,
});
```

3. Use in your application:

```typescript
// app/login/page.tsx
'use client';
import { useLogin } from 'nextauth-simple';

export default function LoginPage() {
  const login = useLogin();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await login({
      email: 'user@example.com',
      password: 'password'
    });
  };
  
  return (
    // Your login form
  );
}
```

## Documentation

For more detailed documentation and examples, please visit our [GitHub repository](https://github.com/yourusername/nextauth-simple).

## License

MIT
