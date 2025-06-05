import crypto from 'crypto';
import {
  type CreateRoleInput,
  type UpdateRoleInput,
  type AssignRoleInput,
  type CheckPermissionInput,
  type RoleResult,
  type UserRoleResult,
  type PermissionCheckResult,
  type UserPermissionsResult,
  type NextAuthSimpleConfigWithRbac,
  type Role
} from './types';
import { rolesTable, userRolesTable } from './db/schema';

// In-memory permission cache
const permissionCache: Record<string, { permissions: string[], timestamp: number }> = {};

/**
 * Create a new role
 * 
 * @param input - Role creation input
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Role creation result
 */
export async function createRole(
  input: CreateRoleInput,
  config: NextAuthSimpleConfigWithRbac
): Promise<RoleResult> {
  try {
    const { name, description, permissions } = input;
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Check if role with same name already exists
    const existingRoles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.name, name))
      .limit(1)
      .execute();

    if (existingRoles.length > 0) {
      return { success: false, error: 'Role with this name already exists' };
    }

    // Create role
    const roleId = crypto.randomUUID();
    const now = new Date();

    const role: Role = {
      id: roleId,
      name,
      description: description || '',
      permissions,
      createdAt: now,
      updatedAt: now
    };

    await db.client.insert(rolesTable).values(role).execute();

    return {
      success: true,
      role
    };
  } catch (error) {
    console.error('Error creating role:', error);
    return { success: false, error: 'Failed to create role' };
  }
}

/**
 * Update an existing role
 * 
 * @param input - Role update input
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Role update result
 */
export async function updateRole(
  input: UpdateRoleInput,
  config: NextAuthSimpleConfigWithRbac
): Promise<RoleResult> {
  try {
    const { id, name, description, permissions } = input;
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Check if role exists
    const existingRoles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.id, id))
      .limit(1)
      .execute();

    if (existingRoles.length === 0) {
      return { success: false, error: 'Role not found' };
    }

    // Check if new name conflicts with existing role
    if (name) {
      const nameConflicts = await db.client
        .select()
        .from(rolesTable)
        .where((eb: any) => eb.and(
          eb.eq(rolesTable.name, name),
          eb.ne(rolesTable.id, id)
        ))
        .limit(1)
        .execute();

      if (nameConflicts.length > 0) {
        return { success: false, error: 'Role with this name already exists' };
      }
    }

    // Update role
    const updateData: any = {
      updatedAt: new Date()
    };

    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (permissions) updateData.permissions = permissions;

    await db.client
      .update(rolesTable)
      .set(updateData)
      .where((eb: any) => eb.eq(rolesTable.id, id))
      .execute();

    // Clear permission cache for all users with this role
    clearPermissionCacheForRole(id);

    // Get updated role
    const updatedRoles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.id, id))
      .limit(1)
      .execute();

    return {
      success: true,
      role: updatedRoles[0] as Role
    };
  } catch (error) {
    console.error('Error updating role:', error);
    return { success: false, error: 'Failed to update role' };
  }
}

/**
 * Delete a role
 * 
 * @param id - Role ID
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Success status
 */
export async function deleteRole(
  id: string,
  config: NextAuthSimpleConfigWithRbac
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Check if role exists
    const existingRoles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.id, id))
      .limit(1)
      .execute();

    if (existingRoles.length === 0) {
      return { success: false, error: 'Role not found' };
    }

    // Check if it's the super admin role
    if (rbacConfig.superAdminRole && existingRoles[0].name === rbacConfig.superAdminRole) {
      return { success: false, error: 'Cannot delete the super admin role' };
    }

    // Check if it's the default role
    if (rbacConfig.defaultRole && existingRoles[0].name === rbacConfig.defaultRole) {
      return { success: false, error: 'Cannot delete the default role' };
    }

    // Delete user role assignments
    await db.client
      .delete(userRolesTable)
      .where((eb: any) => eb.eq(userRolesTable.roleId, id))
      .execute();

    // Delete role
    await db.client
      .delete(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.id, id))
      .execute();

    // Clear permission cache for all users with this role
    clearPermissionCacheForRole(id);

    return { success: true };
  } catch (error) {
    console.error('Error deleting role:', error);
    return { success: false, error: 'Failed to delete role' };
  }
}

/**
 * Get a role by ID
 * 
 * @param id - Role ID
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Role result
 */
export async function getRole(
  id: string,
  config: NextAuthSimpleConfigWithRbac
): Promise<RoleResult> {
  try {
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Get role
    const roles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.id, id))
      .limit(1)
      .execute();

    if (roles.length === 0) {
      return { success: false, error: 'Role not found' };
    }

    return {
      success: true,
      role: roles[0] as Role
    };
  } catch (error) {
    console.error('Error getting role:', error);
    return { success: false, error: 'Failed to get role' };
  }
}

/**
 * Get all roles
 * 
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Array of roles
 */
export async function getAllRoles(
  config: NextAuthSimpleConfigWithRbac
): Promise<{ success: boolean; error?: string; roles?: Role[] }> {
  try {
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Get all roles
    const roles = await db.client
      .select()
      .from(rolesTable)
      .execute();

    return {
      success: true,
      roles: roles as Role[]
    };
  } catch (error) {
    console.error('Error getting all roles:', error);
    return { success: false, error: 'Failed to get roles' };
  }
}

/**
 * Assign a role to a user
 * 
 * @param input - Role assignment input
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Role assignment result
 */
export async function assignRoleToUser(
  input: AssignRoleInput,
  config: NextAuthSimpleConfigWithRbac
): Promise<UserRoleResult> {
  try {
    const { userId, roleId } = input;
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Check if user exists
    const users = await db.client
      .select()
      .from(db.tables.users)
      .where((eb: any) => eb.eq(db.tables.users.id, userId))
      .limit(1)
      .execute();

    if (users.length === 0) {
      return { success: false, error: 'User not found' };
    }

    // Check if role exists
    const roles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.id, roleId))
      .limit(1)
      .execute();

    if (roles.length === 0) {
      return { success: false, error: 'Role not found' };
    }

    // Check if assignment already exists
    const existingAssignments = await db.client
      .select()
      .from(userRolesTable)
      .where((eb: any) => eb.and(
        eb.eq(userRolesTable.userId, userId),
        eb.eq(userRolesTable.roleId, roleId)
      ))
      .limit(1)
      .execute();

    if (existingAssignments.length > 0) {
      return { success: false, error: 'User already has this role' };
    }

    // Create assignment
    const assignmentId = crypto.randomUUID();
    const now = new Date();

    const userRole = {
      id: assignmentId,
      userId,
      roleId,
      createdAt: now,
      updatedAt: now
    };

    await db.client.insert(userRolesTable).values(userRole).execute();

    // Clear permission cache for this user
    clearPermissionCache(userId);

    return {
      success: true,
      userRole
    };
  } catch (error) {
    console.error('Error assigning role to user:', error);
    return { success: false, error: 'Failed to assign role' };
  }
}

/**
 * Remove a role from a user
 * 
 * @param userId - User ID
 * @param roleId - Role ID
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Success status
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string,
  config: NextAuthSimpleConfigWithRbac
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Delete assignment
    await db.client
      .delete(userRolesTable)
      .where((eb: any) => eb.and(
        eb.eq(userRolesTable.userId, userId),
        eb.eq(userRolesTable.roleId, roleId)
      ))
      .execute();

    // Clear permission cache for this user
    clearPermissionCache(userId);

    return { success: true };
  } catch (error) {
    console.error('Error removing role from user:', error);
    return { success: false, error: 'Failed to remove role' };
  }
}

/**
 * Get all roles for a user
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns User roles result
 */
export async function getUserRoles(
  userId: string,
  config: NextAuthSimpleConfigWithRbac
): Promise<{ success: boolean; error?: string; roles?: Role[] }> {
  try {
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Get user role assignments
    const userRoles = await db.client
      .select()
      .from(userRolesTable)
      .where((eb: any) => eb.eq(userRolesTable.userId, userId))
      .execute();

    if (userRoles.length === 0) {
      return { success: true, roles: [] };
    }

    // Get role details
    const roleIds = userRoles.map((ur: any) => ur.roleId);

    const roles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.inArray(rolesTable.id, roleIds))
      .execute();

    return {
      success: true,
      roles: roles as Role[]
    };
  } catch (error) {
    console.error('Error getting user roles:', error);
    return { success: false, error: 'Failed to get user roles' };
  }
}

/**
 * Check if a user has a specific permission
 * 
 * @param input - Permission check input
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Permission check result
 */
export async function checkUserPermission(
  input: CheckPermissionInput,
  config: NextAuthSimpleConfigWithRbac
): Promise<PermissionCheckResult> {
  try {
    const { userId, permission } = input;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled', hasPermission: false };
    }

    // Check cache first if enabled
    if (rbacConfig.cachePermissions !== false) {
      const cachedPermissions = getPermissionsFromCache(userId, config);
      if (cachedPermissions) {
        return {
          success: true,
          hasPermission: cachedPermissions.includes(permission)
        };
      }
    }

    // Get user permissions
    const userPermissionsResult = await getUserPermissions(userId, config);

    if (!userPermissionsResult.success) {
      return { success: false, error: userPermissionsResult.error, hasPermission: false };
    }

    const permissions = userPermissionsResult.permissions || [];

    return {
      success: true,
      hasPermission: permissions.includes(permission)
    };
  } catch (error) {
    console.error('Error checking user permission:', error);
    return { success: false, error: 'Failed to check permission', hasPermission: false };
  }
}

/**
 * Get all permissions for a user
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns User permissions result
 */
export async function getUserPermissions(
  userId: string,
  config: NextAuthSimpleConfigWithRbac
): Promise<UserPermissionsResult> {
  try {
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Check cache first if enabled
    if (rbacConfig.cachePermissions !== false) {
      const cachedPermissions = getPermissionsFromCache(userId, config);
      if (cachedPermissions) {
        return {
          success: true,
          permissions: cachedPermissions
        };
      }
    }

    // Get user roles
    const userRolesResult = await getUserRoles(userId, config);

    if (!userRolesResult.success) {
      return { success: false, error: userRolesResult.error };
    }

    const roles = userRolesResult.roles || [];

    // Collect all permissions from roles
    const permissionSet = new Set<string>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        permissionSet.add(permission);
      }
    }

    const permissions = Array.from(permissionSet);

    // Cache permissions if enabled
    if (rbacConfig.cachePermissions !== false) {
      cachePermissions(userId, permissions, config);
    }

    return {
      success: true,
      permissions,
      roles
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return { success: false, error: 'Failed to get user permissions' };
  }
}

/**
 * Initialize default roles
 * 
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Success status
 */
export async function initializeDefaultRoles(
  config: NextAuthSimpleConfigWithRbac
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    // Check if roles already exist
    const existingRoles = await db.client
      .select()
      .from(rolesTable)
      .limit(1)
      .execute();

    if (existingRoles.length > 0) {
      return { success: true }; // Roles already initialized
    }

    // Create default roles
    const now = new Date();

    // Admin role
    const adminRoleId = crypto.randomUUID();
    await db.client.insert(rolesTable).values({
      id: adminRoleId,
      name: 'admin',
      description: 'Administrator with full access',
      permissions: ['*'], // Wildcard for all permissions
      createdAt: now,
      updatedAt: now
    }).execute();

    // User role
    const userRoleId = crypto.randomUUID();
    await db.client.insert(rolesTable).values({
      id: userRoleId,
      name: 'user',
      description: 'Regular user with basic access',
      permissions: ['profile:read', 'profile:update'],
      createdAt: now,
      updatedAt: now
    }).execute();

    return { success: true };
  } catch (error) {
    console.error('Error initializing default roles:', error);
    return { success: false, error: 'Failed to initialize default roles' };
  }
}

/**
 * Assign default role to user
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Success status
 */
export async function assignDefaultRoleToUser(
  userId: string,
  config: NextAuthSimpleConfigWithRbac
): Promise<{ success: boolean; error?: string }> {
  try {
    const { db } = config;
    const rbacConfig = config.features?.rbac;

    if (!rbacConfig?.enabled) {
      return { success: false, error: 'Role-based access control is not enabled' };
    }

    const defaultRoleName = rbacConfig.defaultRole || 'user';

    // Get default role
    const roles = await db.client
      .select()
      .from(rolesTable)
      .where((eb: any) => eb.eq(rolesTable.name, defaultRoleName))
      .limit(1)
      .execute();

    if (roles.length === 0) {
      return { success: false, error: 'Default role not found' };
    }

    const roleId = roles[0].id;

    // Assign role to user
    const result = await assignRoleToUser({ userId, roleId }, config);

    return {
      success: result.success,
      error: result.error
    };
  } catch (error) {
    console.error('Error assigning default role to user:', error);
    return { success: false, error: 'Failed to assign default role' };
  }
}

/**
 * Cache user permissions
 * 
 * @param userId - User ID
 * @param permissions - User permissions
 * @param config - NextAuth-Simple configuration with RBAC
 */
function cachePermissions(userId: string, permissions: string[], config: NextAuthSimpleConfigWithRbac): void {
  const rbacConfig = config.features?.rbac;
  const ttl = rbacConfig?.cacheTTLSeconds || 300; // Default: 5 minutes

  permissionCache[userId] = {
    permissions,
    timestamp: Date.now() + (ttl * 1000)
  };
}

/**
 * Get permissions from cache
 * 
 * @param userId - User ID
 * @param config - NextAuth-Simple configuration with RBAC
 * @returns Cached permissions or null if not in cache
 */
function getPermissionsFromCache(userId: string, config: NextAuthSimpleConfigWithRbac): string[] | null {
  const cached = permissionCache[userId];

  if (!cached) {
    return null;
  }

  // Check if cache is expired
  if (Date.now() > cached.timestamp) {
    delete permissionCache[userId];
    return null;
  }

  return cached.permissions;
}

/**
 * Clear permission cache for a user
 * 
 * @param userId - User ID
 */
function clearPermissionCache(userId: string): void {
  delete permissionCache[userId];
}

/**
 * Clear permission cache for all users with a specific role
 * 
 * @param roleId - Role ID
 */
function clearPermissionCacheForRole(roleId: string): void {
  // Since we don't track which users have which roles in the cache,
  // we need to clear the entire cache
  Object.keys(permissionCache).forEach(key => {
    delete permissionCache[key];
  });
}
