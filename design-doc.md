# NextAuth-Simple Enhancement Design

## Modular Architecture for Advanced Features

After analyzing the current codebase, I'll design a modular architecture that allows each advanced authentication feature to be:

1. **Opt-in**: Users can choose which features to enable
2. **Independent**: Features don't depend on each other
3. **Simple**: Each feature maintains the library's simplicity
4. **Extensible**: Easy to add more features in the future

## Directory Structure

```
src/
├── core/           # Core functionality (moved from root)
│   ├── auth.ts     # Basic email/password auth
│   ├── session.ts  # Session management
│   ├── types.ts    # Core type definitions
│   └── ...
├── features/       # Advanced features (new)
│   ├── twoFactor/  # 2FA implementation
│   ├── magicUrl/   # Passwordless email login
│   ├── social/     # Social media logins
│   ├── password/   # Password reset
│   ├── rbac/       # Role-based access control
│   ├── passkeys/   # WebAuthn support
│   └── ...
├── utils/          # Shared utilities
├── index.ts        # Main entry point
└── config.ts       # Enhanced configuration
```

## Feature Integration Strategy

Each feature will follow this pattern:
- Self-contained in its own directory
- Exports a clear API
- Has its own configuration section
- Provides hooks and components as needed
- Includes documentation and examples

## Configuration Approach

Extend the current configuration to support new features:

```typescript
export interface NextAuthSimpleConfig {
  // Existing core config
  db: { ... };
  security?: { ... };
  
  // Feature flags and config
  features?: {
    twoFactor?: {
      enabled: boolean;
      // 2FA specific config
    };
    magicUrl?: {
      enabled: boolean;
      // Magic URL specific config
    };
    social?: {
      enabled: boolean;
      providers: {
        google?: { ... };
        apple?: { ... };
        // Other providers
      };
    };
    passwordReset?: {
      enabled: boolean;
      // Password reset config
    };
    rbac?: {
      enabled: boolean;
      // RBAC config
    };
    passkeys?: {
      enabled: boolean;
      // WebAuthn config
    };
  };
}
```

## Database Schema Extensions

Each feature will extend the database schema as needed:

```typescript
// Example schema extensions
export const usersTwoFactorTable = pgTable('users_two_factor', {
  userId: text('user_id').primaryKey().references(() => usersTable.id),
  secret: text('secret').notNull(),
  enabled: boolean('enabled').default(false),
  backupCodes: text('backup_codes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => usersTable.id),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Additional tables for other features
```

## Implementation Plan for Each Feature

### 1. Two-Factor Authentication (2FA)
- Support TOTP (Time-based One-Time Password)
- QR code generation for app setup
- Backup codes for recovery
- Integration with login flow

### 2. Magic URL (Passwordless Email)
- Email sending infrastructure
- Secure token generation and validation
- Login flow integration

### 3. Social Logins
- OAuth integration for Google, Apple, etc.
- Profile data mapping
- Account linking

### 4. Password Reset
- Secure token generation
- Email sending
- Token validation and password update

### 5. Role-Based Access Control
- Role definition and assignment
- Permission checking
- Middleware integration

### 6. Passkeys (WebAuthn)
- Credential creation and storage
- Authentication with biometrics/security keys
- Integration with existing auth flows

### 7. Additional Features
- Account verification
- Session management enhancements
- Audit logging

## Integration with Core

Each feature will hook into the core authentication flow through extension points:

```typescript
// Example extension point in loginUser
export async function loginUser(
  input: LoginInput,
  config: NextAuthSimpleConfig
): Promise<AuthResult> {
  // Basic email/password authentication
  const basicAuthResult = await performBasicAuth(input, config);
  
  if (!basicAuthResult.success) {
    return basicAuthResult;
  }
  
  // Extension point for 2FA
  if (config.features?.twoFactor?.enabled) {
    return handleTwoFactorAuth(basicAuthResult, input, config);
  }
  
  // Create session and return result
  return createSessionAndReturn(basicAuthResult, config);
}
```

## Next Steps

1. Refactor current code to support this modular architecture
2. Implement each feature in order of priority
3. Create comprehensive documentation and examples
4. Ensure backward compatibility
