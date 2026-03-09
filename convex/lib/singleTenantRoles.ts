export type SingleTenantResolvedRole = "superadmin" | "admin" | "coach";

export function normalizeSingleTenantMetadataRole(
  role: unknown,
): "admin" | "coach" | null {
  if (role === "admin" || role === "coach") {
    return role;
  }

  if (role === "org:admin" || role === "org:superadmin") {
    return "admin";
  }

  if (role === "member" || role === "org:member") {
    return "coach";
  }

  return null;
}

export function metadataRoleFromResolvedRole(
  role: SingleTenantResolvedRole,
): "admin" | "coach" {
  return role === "superadmin" || role === "admin" ? "admin" : "coach";
}

export function resolveSingleTenantRoleFromMetadata(metadata: {
  role?: unknown;
  isSuperAdmin?: unknown;
}): SingleTenantResolvedRole {
  if (metadata.isSuperAdmin === true) {
    return "superadmin";
  }

  const role = metadata.role;
  if (role === "superadmin" || role === "org:superadmin") {
    return "superadmin";
  }

  if (role === "admin" || role === "org:admin") {
    return "admin";
  }

  if (role === "coach" || role === "member" || role === "org:member") {
    return "coach";
  }

  return "coach";
}
