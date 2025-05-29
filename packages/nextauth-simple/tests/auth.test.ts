import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import bcrypt from 'bcrypt';
import { registerUser, loginUser } from '../src/auth';

// Mock dependencies
jest.mock('bcrypt');
jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn()
  })
}));

describe('Authentication Module', () => {
  // Mock config
  const mockConfig = {
    db: {
      client: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        execute: jest.fn(),
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(true as never)
          })
        }),
        delete: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            execute: jest.fn().mockResolvedValue(true as never)
          })
        })
      },
      tables: {
        users: { email: { toLowerCase: jest.fn() } },
        sessions: {}
      }
    },
    security: {
      bcryptWorkFactor: 12
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user successfully', async () => {
      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password' as never);

      // Mock user doesn't exist
      mockConfig.db.client.execute.mockResolvedValueOnce([] as never);

      const result = await registerUser(
        { email: 'test@example.com', password: 'password123' },
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should return error if user already exists', async () => {
      // Mock user exists
      mockConfig.db.client.execute.mockResolvedValueOnce([{ id: '123', email: 'test@example.com' }] as never);

      const result = await registerUser(
        { email: 'test@example.com', password: 'password123' },
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('User already exists');
    });

    it('should validate email format', async () => {
      const result = await registerUser(
        { email: 'invalid', password: 'password123' },
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
    });

    it('should validate password length', async () => {
      const result = await registerUser(
        { email: 'test@example.com', password: 'short' },
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 8 characters long');
    });
  });

  describe('loginUser', () => {
    it('should login user successfully with correct credentials', async () => {
      // Mock user exists
      mockConfig.db.client.execute.mockResolvedValueOnce([{
        id: '123',
        email: 'test@example.com',
        password: 'hashed_password'
      }] as never);

      // Mock password match
      (bcrypt.compare as jest.Mock).mockResolvedValue(true as never);

      const result = await loginUser(
        { email: 'test@example.com', password: 'password123' },
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.session).toBeDefined();
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
    });

    it('should return error with incorrect password', async () => {
      // Mock user exists
      mockConfig.db.client.execute.mockResolvedValueOnce([{
        id: '123',
        email: 'test@example.com',
        password: 'hashed_password'
      }] as never);

      // Mock password doesn't match
      (bcrypt.compare as jest.Mock).mockResolvedValue(false as never);

      const result = await loginUser(
        { email: 'test@example.com', password: 'wrong_password' },
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should return error if user does not exist', async () => {
      // Mock user doesn't exist
      mockConfig.db.client.execute.mockResolvedValueOnce([] as never);

      const result = await loginUser(
        { email: 'nonexistent@example.com', password: 'password123' },
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });
});
