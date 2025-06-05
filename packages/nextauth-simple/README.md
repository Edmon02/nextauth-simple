# NextAuth-Simple Enhanced

A comprehensive, modular authentication library for Next.js App Router applications with advanced features.

## Features

NextAuth-Simple now includes the following advanced authentication features, all of which are modular and opt-in:

### Core Features (Original)
- Email/password authentication
- Session management with HTTP-only cookies
- Next.js App Router integration
- TypeScript support
- PostgreSQL integration via Drizzle ORM

### Advanced Features (New)
- **Two-Factor Authentication (2FA)**
  - TOTP (Time-based One-Time Password) support
  - QR code generation for easy setup
  - Recovery codes for backup access
  - Complete setup, verification, and challenge flows

- **Magic URL (Passwordless Email Login)**
  - Secure token generation and validation
  - Email sending infrastructure with customizable templates
  - Seamless integration with existing authentication flow

- **Social Logins**
  - Support for Google, Apple, and GitHub
  - Extensible OAuth provider base class for easy addition of more providers
  - Account linking and profile data mapping

- **Password Reset Functionality**
  - Secure token generation and email delivery
  - Complete reset flow with verification and password update
  - Protection against user enumeration

- **Role-Based Access Control (RBAC)**
  - Flexible role and permission management
  - Permission checking with caching for performance
  - Default roles and automatic assignment
  - Comprehensive API for role management

- **Passkeys (WebAuthn) Support**
  - Modern passwordless authentication with biometrics and security keys
  - Registration and authentication flows
  - Credential management

- **Account Verification**
  - Email verification flow
  - Verification status tracking
  - Optional enforcement of verified accounts for login

- **Audit Logging**
  - Comprehensive logging of authentication events
  - Configurable retention and filtering
  - Query API for audit trail access

## Installation

```bash
# Using npm
npm install nextauth-simple

# Using yarn
yarn add nextauth-simple

# Using pnpm
pnpm add nextauth-simple

# Using bun
bun add nextauth-simple
```

## Basic Usage

```typescript
// src/lib/auth.ts
import { createDrizzleClient, initializeNextAuthSimple, createDefaultConfig } from 'nextauth-simple';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create database client
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// Create default configuration with all features disabled
const defaultConfig = createDefaultConfig({
  client: db,
  tables: {
    users: {
      id: 'id',
      email: 'email',
      password: 'password',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    sessions: {
      id: 'id',
      userId: 'user_id',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
});

// Enable desired features
const config = {
  ...defaultConfig,
  features: {
    ...defaultConfig.features,
    twoFactor: {
      ...defaultConfig.features.twoFactor,
      enabled: true,
      issuer: 'My App'
    },
    passwordReset: {
      ...defaultConfig.features.passwordReset,
      enabled: true,
      tokenExpiryMinutes: 30,
      emailSubject: 'Reset your password for My App'
    }
    // Enable other features as needed
  }
};

// Initialize NextAuth-Simple with all configured features
export const { auth, session, middleware } = await initializeNextAuthSimple(config);
```

## Advanced Configuration

### Two-Factor Authentication

```typescript
twoFactor: {
  enabled: true,
  issuer: 'My App', // Name shown in authenticator apps
  codeLength: 6, // Length of TOTP code
  stepSeconds: 30, // TOTP time step in seconds
  window: 1, // Number of steps to check before/after current time
  recoveryCodeCount: 10 // Number of recovery codes to generate
}
```

### Magic URL (Passwordless Email Login)

```typescript
magicUrl: {
  enabled: true,
  tokenExpiryMinutes: 15, // How long magic links are valid
  emailSubject: 'Your login link for My App',
  emailFrom: 'noreply@myapp.com',
  redirectUrl: '/login/callback', // Where to redirect after clicking link
  sendEmail: async (to, subject, html) => {
    // Custom email sending function
    return true;
  }
}
```

### Social Logins

```typescript
social: {
  enabled: true,
  providers: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: 'email profile'
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: 'user:email'
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
      scope: 'name email'
    }
  }
}
```

### Password Reset

```typescript
passwordReset: {
  enabled: true,
  tokenExpiryMinutes: 15, // How long reset tokens are valid
  emailSubject: 'Reset your password',
  emailFrom: 'noreply@myapp.com',
  redirectUrl: '/reset-password', // Where to redirect after clicking link
  sendEmail: async (to, subject, html) => {
    // Custom email sending function
    return true;
  },
  minimumPasswordLength: 8 // Minimum password length
}
```

### Role-Based Access Control (RBAC)

```typescript
rbac: {
  enabled: true,
  defaultRole: 'user', // Role assigned to new users
  superAdminRole: 'admin', // Role with all permissions
  cachePermissions: true, // Whether to cache permissions
  cacheTTLSeconds: 300 // Cache TTL in seconds
}
```

### Passkeys (WebAuthn)

```typescript
passkeys: {
  enabled: true,
  rpName: 'My App', // Relying Party name
  rpID: 'myapp.com', // Relying Party ID (domain)
  origin: 'https://myapp.com', // Origin URL
  challengeTimeoutSeconds: 60, // How long a challenge is valid
  userVerification: 'preferred', // 'required', 'preferred', 'discouraged'
  attestation: 'none', // 'none', 'indirect', 'direct'
  authenticatorAttachment: 'platform' // 'platform', 'cross-platform'
}
```

### Account Verification

```typescript
verification: {
  enabled: true,
  tokenExpiryMinutes: 60, // How long verification tokens are valid
  emailSubject: 'Verify your account',
  emailFrom: 'noreply@myapp.com',
  redirectUrl: '/verify-account', // Where to redirect after clicking link
  sendEmail: async (to, subject, html) => {
    // Custom email sending function
    return true;
  },
  requireVerification: true // Whether to require verification for login
}
```

### Audit Logging

```typescript
audit: {
  enabled: true,
  logLogin: true, // Whether to log login attempts
  logRegistration: true, // Whether to log registrations
  logPasswordReset: true, // Whether to log password resets
  logAccountVerification: true, // Whether to log account verifications
  logRoleChanges: true, // Whether to log role changes
  logCredentialChanges: true, // Whether to log credential changes
  logSessionOperations: true, // Whether to log session operations
  retentionDays: 90 // How long to keep audit logs
}
```

## API Reference

### Two-Factor Authentication

```typescript
import { 
  setupTwoFactor, 
  verifyTwoFactorSetup, 
  generateRecoveryCodes,
  verifyTwoFactorCode,
  verifyTwoFactorRecoveryCode,
  disableTwoFactor,
  getUserTwoFactorStatus
} from 'nextauth-simple';

// Setup 2FA for a user
const setupResult = await setupTwoFactor(userId, config);
// Returns { success: true, secret: '...', qrCode: '...' }

// Verify 2FA setup with a code from authenticator app
const verifyResult = await verifyTwoFactorSetup({ userId, code }, config);
// Returns { success: true, enabled: true }

// Generate recovery codes
const codesResult = await generateRecoveryCodes(userId, config);
// Returns { success: true, recoveryCodes: ['...', '...'] }

// Verify a 2FA code during login
const codeResult = await verifyTwoFactorCode({ userId, code }, config);
// Returns { success: true, valid: true }

// Verify a recovery code during login
const recoveryResult = await verifyTwoFactorRecoveryCode({ userId, code }, config);
// Returns { success: true, valid: true, remainingCodes: 9 }

// Disable 2FA for a user
const disableResult = await disableTwoFactor(userId, config);
// Returns { success: true }

// Check if a user has 2FA enabled
const statusResult = await getUserTwoFactorStatus(userId, config);
// Returns { success: true, enabled: true }
```

### Magic URL (Passwordless Email Login)

```typescript
import { 
  sendMagicLink, 
  verifyMagicToken 
} from 'nextauth-simple';

// Send a magic link to a user
const sendResult = await sendMagicLink({ 
  email: 'user@example.com',
  redirectUrl: '/dashboard'
}, config);
// Returns { success: true, emailSent: true }

// Verify a magic token when user clicks the link
const verifyResult = await verifyMagicToken({ 
  token: 'abc123',
  email: 'user@example.com'
}, config);
// Returns { success: true, user: {...}, session: {...} }
```

### Social Logins

```typescript
import { 
  getSocialAuthorizationUrl, 
  handleSocialCallback,
  getAvailableSocialProviders
} from 'nextauth-simple';

// Get authorization URL for a social provider
const authUrlResult = getSocialAuthorizationUrl(
  'google',
  config,
  'https://myapp.com/api/auth/callback/google',
  '/dashboard'
);
// Returns { url: 'https://accounts.google.com/o/oauth2/...', state: '...' }

// Handle callback from social provider
const callbackResult = await handleSocialCallback(
  'google',
  code,
  state,
  config
);
// Returns { success: true, profile: {...}, email: '...' }

// Get list of available social providers
const providers = getAvailableSocialProviders(config);
// Returns ['google', 'github', 'apple']
```

### Password Reset

```typescript
import { 
  requestPasswordReset, 
  verifyPasswordResetToken,
  completePasswordReset
} from 'nextauth-simple';

// Request a password reset
const requestResult = await requestPasswordReset({ 
  email: 'user@example.com',
  redirectUrl: '/reset-password'
}, config);
// Returns { success: true, emailSent: true }

// Verify a password reset token
const verifyResult = await verifyPasswordResetToken({ 
  token: 'abc123',
  email: 'user@example.com'
}, config);
// Returns { success: true, valid: true, userId: '...' }

// Complete password reset
const completeResult = await completePasswordReset({ 
  token: 'abc123',
  email: 'user@example.com',
  password: 'newPassword123'
}, config);
// Returns { success: true, passwordUpdated: true }
```

### Role-Based Access Control (RBAC)

```typescript
import { 
  createRole,
  updateRole,
  deleteRole,
  getRole,
  getAllRoles,
  assignRoleToUser,
  removeRoleFromUser,
  getUserRoles,
  checkUserPermission,
  getUserPermissions,
  initializeDefaultRoles,
  assignDefaultRoleToUser
} from 'nextauth-simple';

// Create a new role
const createResult = await createRole({
  name: 'editor',
  description: 'Can edit content',
  permissions: ['content:read', 'content:write']
}, config);
// Returns { success: true, role: {...} }

// Update an existing role
const updateResult = await updateRole({
  id: 'role-id',
  name: 'senior-editor',
  permissions: ['content:read', 'content:write', 'content:publish']
}, config);
// Returns { success: true, role: {...} }

// Delete a role
const deleteResult = await deleteRole('role-id', config);
// Returns { success: true }

// Get a role by ID
const getResult = await getRole('role-id', config);
// Returns { success: true, role: {...} }

// Get all roles
const getAllResult = await getAllRoles(config);
// Returns { success: true, roles: [...] }

// Assign a role to a user
const assignResult = await assignRoleToUser({
  userId: 'user-id',
  roleId: 'role-id'
}, config);
// Returns { success: true, userRole: {...} }

// Remove a role from a user
const removeResult = await removeRoleFromUser('user-id', 'role-id', config);
// Returns { success: true }

// Get all roles for a user
const userRolesResult = await getUserRoles('user-id', config);
// Returns { success: true, roles: [...] }

// Check if a user has a specific permission
const permissionResult = await checkUserPermission({
  userId: 'user-id',
  permission: 'content:write'
}, config);
// Returns { success: true, hasPermission: true }

// Get all permissions for a user
const permissionsResult = await getUserPermissions('user-id', config);
// Returns { success: true, permissions: [...], roles: [...] }

// Initialize default roles (admin and user)
const initResult = await initializeDefaultRoles(config);
// Returns { success: true }

// Assign default role to a user
const defaultRoleResult = await assignDefaultRoleToUser('user-id', config);
// Returns { success: true }
```

### Passkeys (WebAuthn)

```typescript
import { 
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  getUserCredentials,
  deleteCredential
} from 'nextauth-simple';

// Get options for registering a new passkey
const regOptionsResult = await getRegistrationOptions({
  userId: 'user-id',
  username: 'user@example.com',
  displayName: 'John Doe'
}, config);
// Returns { success: true, options: {...}, challenge: '...' }

// Verify passkey registration
const regVerifyResult = await verifyRegistration({
  userId: 'user-id',
  credential: {...} // Credential from navigator.credentials.create()
}, config);
// Returns { success: true, credential: {...} }

// Get options for authenticating with a passkey
const authOptionsResult = await getAuthenticationOptions({
  userId: 'user-id' // Optional, if not provided, all credentials will be allowed
}, config);
// Returns { success: true, options: {...}, challenge: '...' }

// Verify passkey authentication
const authVerifyResult = await verifyAuthentication({
  credential: {...} // Credential from navigator.credentials.get()
}, config);
// Returns { success: true, credential: {...}, user: {...}, session: {...} }

// Get all passkeys for a user
const credentialsResult = await getUserCredentials('user-id', config);
// Returns { success: true, credentials: [...] }

// Delete a passkey
const deleteResult = await deleteCredential('credential-id', 'user-id', config);
// Returns { success: true }
```

### Account Verification

```typescript
import { 
  requestVerification,
  verifyAccount,
  getUserVerificationStatus,
  isVerificationRequired,
  markUserAsVerified
} from 'nextauth-simple';

// Request account verification
const requestResult = await requestVerification({
  userId: 'user-id',
  email: 'user@example.com',
  redirectUrl: '/verify-account'
}, config);
// Returns { success: true, emailSent: true }

// Verify account with token
const verifyResult = await verifyAccount({
  token: 'abc123',
  email: 'user@example.com'
}, config);
// Returns { success: true, verified: true }

// Get user verification status
const statusResult = await getUserVerificationStatus('user-id', config);
// Returns { success: true, status: { verified: true, verifiedAt: Date, ... } }

// Check if verification is required for login
const required = isVerificationRequired(config);
// Returns true or false

// Mark user as verified manually
const markResult = await markUserAsVerified('user-id', 'admin', config);
// Returns { success: true }
```

### Audit Logging

```typescript
import { 
  createAuditLog,
  queryAuditLogs,
  cleanupAuditLogs,
  getAuditLog
} from 'nextauth-simple';

// Create an audit log entry
const createResult = await createAuditLog({
  userId: 'user-id',
  action: 'login.success',
  resource: 'session',
  resourceId: 'session-id',
  details: { ip: '192.168.1.1', userAgent: 'Mozilla/5.0...' },
  status: 'success'
}, config);
// Returns { success: true, log: {...} }

// Query audit logs
const queryResult = await queryAuditLogs({
  userId: 'user-id',
  action: 'login.success',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
  limit: 10,
  offset: 0
}, config);
// Returns { success: true, logs: [...], total: 42 }

// Clean up old audit logs
const cleanupResult = await cleanupAuditLogs(config);
// Returns { success: true, deletedCount: 123 }

// Get audit log by ID
const getResult = await getAuditLog('log-id', config);
// Returns { success: true, log: {...} }
```

## Example: Complete Authentication Flow

```typescript
// src/app/api/auth/register/route.ts
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  
  const result = await auth.register(email, password);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  return NextResponse.json({ success: true });
}
```

```typescript
// src/app/api/auth/login/route.ts
import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  
  const result = await auth.login(email, password);
  
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  
  // Check if 2FA is required
  if (result.twoFactorRequired) {
    return NextResponse.json({ 
      success: true, 
      twoFactorRequired: true,
      userId: result.userId
    });
  }
  
  // Set session cookie
  const { setCookie } = auth.session;
  const response = NextResponse.json({ success: true });
  setCookie(response, result.session);
  
  return response;
}
```

```typescript
// src/app/api/auth/2fa/verify/route.ts
import { auth, verifyTwoFactorCode } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { userId, code } = await request.json();
  
  const result = await verifyTwoFactorCode({ userId, code }, auth.config);
  
  if (!result.success || !result.valid) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  }
  
  // Create session
  const sessionResult = await auth.createSession(userId);
  
  // Set session cookie
  const { setCookie } = auth.session;
  const response = NextResponse.json({ success: true });
  setCookie(response, sessionResult);
  
  return response;
}
```

## Example: Using Role-Based Access Control

```typescript
// src/middleware.ts
import { middleware } from '@/lib/auth';
import { checkUserPermission } from 'nextauth-simple';
import { NextResponse } from 'next/server';

export default async function authMiddleware(request) {
  // Check if user is authenticated
  const result = await middleware(request);
  
  // If not authenticated or error, return the result
  if (!result.success || result.redirect) {
    return result.response;
  }
  
  // Check permissions for protected routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const permissionResult = await checkUserPermission({
      userId: result.session.userId,
      permission: 'admin:access'
    }, auth.config);
    
    if (!permissionResult.success || !permissionResult.hasPermission) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }
  
  return result.response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/api/admin/:path*']
};
```

## Example: Using Passkeys (WebAuthn)

```typescript
// src/app/register-passkey/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'nextauth-simple/react';

export default function RegisterPasskeyPage() {
  const { session } = useSession();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  async function registerPasskey() {
    try {
      // 1. Get registration options from server
      const optionsResponse = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.userId })
      });
      
      const { options } = await optionsResponse.json();
      
      // 2. Create credential using Web Authentication API
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: base64UrlDecode(options.challenge),
          user: {
            ...options.user,
            id: base64UrlDecode(options.user.id)
          },
          excludeCredentials: options.excludeCredentials?.map(cred => ({
            ...cred,
            id: base64UrlDecode(cred.id)
          }))
        }
      });
      
      // 3. Verify registration with server
      const verifyResponse = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          credential: {
            id: credential.id,
            type: credential.type,
            rawId: arrayBufferToBase64Url(credential.rawId),
            response: {
              clientDataJSON: arrayBufferToBase64Url(credential.response.clientDataJSON),
              attestationObject: arrayBufferToBase64Url(credential.response.attestationObject)
            }
          }
        })
      });
      
      const result = await verifyResponse.json();
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Failed to register passkey');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    }
  }
  
  return (
    <div>
      <h1>Register Passkey</h1>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">Passkey registered successfully!</p>}
      <button onClick={registerPasskey}>Register Passkey</button>
    </div>
  );
}

// Helper functions for WebAuthn encoding/decoding
function arrayBufferToBase64Url(buffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const binStr = atob(base64);
  const bin = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) {
    bin[i] = binStr.charCodeAt(i);
  }
  return bin.buffer;
}
```

## Migration from Previous Version

If you're migrating from a previous version of NextAuth-Simple, follow these steps:

1. Update your package:
   ```bash
   npm install nextauth-simple@latest
   ```

2. Update your configuration:
   ```typescript
   // Before
   import { createDrizzleClient } from 'nextauth-simple';
   
   const db = createDrizzleClient(connectionString);
   
   export const { auth, session, middleware } = createNextAuthSimple({
     db,
     security: {
       bcryptWorkFactor: 12,
       sessionExpiryMinutes: 60 * 24
     }
   });
   
   // After
   import { createDrizzleClient, initializeNextAuthSimple, createDefaultConfig } from 'nextauth-simple';
   
   const db = createDrizzleClient(connectionString);
   
   const config = createDefaultConfig({
     client: db,
     tables: {
       users: {
         id: 'id',
         email: 'email',
         password: 'password',
         createdAt: 'created_at',
         updatedAt: 'updated_at'
       },
       sessions: {
         id: 'id',
         userId: 'user_id',
         expiresAt: 'expires_at',
         createdAt: 'created_at',
         updatedAt: 'updated_at'
       }
     }
   });
   
   // Enable features as needed
   config.features.twoFactor.enabled = true;
   
   export const { auth, session, middleware } = await initializeNextAuthSimple(config);
   ```

3. Run database migrations:
   ```typescript
   import { createFeatureSchemas } from 'nextauth-simple';
   
   // Create tables for enabled features
   await createFeatureSchemas(config);
   ```

## License

MIT
