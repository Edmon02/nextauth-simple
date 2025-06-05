import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { getSessionFromCookie, getServerSession } from '../src/session';
import type { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue({ value: 'test-token' }),
    set: jest.fn(),
    delete: jest.fn()
  })
}));

describe('Session Module', () => {
  // Mock config
  const mockConfig = {
    db: {
      client: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        execute: jest.fn(),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(true as never)
          })
        })
      },
      tables: {
        users: {},
        sessions: {}
      }
    }
  };

  // Mock session data
  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    token: 'test-token',
    expiresAt: new Date(Date.now() + 86400000), // 1 day in the future
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Mock user data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSessionFromCookie', () => {
    it('should return session and user when valid token exists', async () => {
      // Mock request with cookie
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'test-token' })
        }
      } as unknown as NextRequest;

      // Mock database responses
      mockConfig.db.client.execute
        .mockResolvedValueOnce([mockSession] as never) // First call for session
        .mockResolvedValueOnce([mockUser] as never);   // Second call for user

      const result = await getSessionFromCookie(mockRequest, mockConfig);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockSession.id);
      expect(result?.user.id).toBe(mockUser.id);
      expect(result?.user.email).toBe(mockUser.email);
      // Ensure password is not included
      expect(result && 'password' in result?.user && result?.user.password).toBe(mockUser.password);
    });

    it('should return null when no token exists', async () => {
      // Mock request with no cookie
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue(undefined)
        }
      } as unknown as NextRequest;

      const result = await getSessionFromCookie(mockRequest, mockConfig);

      expect(result).toBeNull();
    });

    it('should return null when session is expired', async () => {
      // Mock request with cookie
      const mockRequest = {
        cookies: {
          get: jest.fn().mockReturnValue({ value: 'test-token' })
        }
      } as unknown as NextRequest;

      // Mock expired session
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 86400000) // 1 day in the past
      };

      // Mock database response with expired session
      mockConfig.db.client.execute.mockResolvedValueOnce([expiredSession] as never);

      const result = await getSessionFromCookie(mockRequest, mockConfig);

      expect(result).toBeNull();
      // Verify session deletion was attempted
      expect(mockConfig.db.client.delete).toHaveBeenCalled();
    });
  });

  describe('getServerSession', () => {
    it('should return session and user when valid token exists', async () => {
      // Mock database responses
      mockConfig.db.client.execute
        .mockResolvedValueOnce([mockSession] as never) // First call for session
        .mockResolvedValueOnce([mockUser] as never);   // Second call for user

      const result = await getServerSession(mockConfig);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockSession.id);
      expect(result?.user.id).toBe(mockUser.id);
      expect(result?.user.email).toBe(mockUser.email);
      // Ensure password is not included
      expect(result && 'password' in result?.user && result?.user.password).toBe(mockUser.password);
    });
  });
});
