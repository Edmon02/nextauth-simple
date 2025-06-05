import { NextAuthSimpleConfig } from '../../core/types';
import { NextAuthSimpleConfigWithTwoFactor } from '../twoFactor/types';
import { NextAuthSimpleConfigWithMagicUrl } from '../magicUrl/types';
import { NextAuthSimpleConfigWithSocial } from '../social/types';
import { NextAuthSimpleConfigWithPasswordReset } from '../password/types';

/**
 * Role-Based Access Control configuration
 */
export interface RbacConfig {
  enabled: boolean;
  defaultRole?: string; // Default role for new users
  superAdminRole?: string; // Role with all permissions
  cachePermissions?: boolean; // Whether to cache permissions (default: true)
  cacheTTLSeconds?: number; // Cache TTL in seconds (default: 300)
}

/**
 * Extended NextAuthSimpleConfig with RBAC
 */
export interface NextAuthSimpleConfigWithRbac extends NextAuthSimpleConfig {
  features?: {
    twoFactor?: NextAuthSimpleConfigWithTwoFactor['features'];
    magicUrl?: NextAuthSimpleConfigWithMagicUrl['features'];
    social?: NextAuthSimpleConfigWithSocial['features'];
    passwordReset?: NextAuthSimpleConfigWithPasswordReset['features'];
    rbac?: RbacConfig;
    // Other features will be added here
  };
}

/**
 * Role definition
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User role assignment
 */
export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role creation input
 */
export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions: string[];
}

/**
 * Role update input
 */
export interface UpdateRoleInput {
  id: string;
  name?: string;
  description?: string;
  permissions?: string[];
}

/**
 * User role assignment input
 */
export interface AssignRoleInput {
  userId: string;
  roleId: string;
}

/**
 * Permission check input
 */
export interface CheckPermissionInput {
  userId: string;
  permission: string;
}

/**
 * Role operation result
 */
export interface RoleResult {
  success: boolean;
  error?: string;
  role?: Role;
}

/**
 * User role operation result
 */
export interface UserRoleResult {
  success: boolean;
  error?: string;
  userRole?: UserRole;
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  success: boolean;
  error?: string;
  hasPermission: boolean;
}

/**
 * User permissions result
 */
export interface UserPermissionsResult {
  success: boolean;
  error?: string;
  permissions?: string[];
  roles?: Role[];
}
