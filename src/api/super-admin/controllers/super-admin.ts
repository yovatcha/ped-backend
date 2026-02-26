"use strict";

/**
 * Manually resolves the authenticated user from the Bearer token.
 * Needed because these routes use auth: false to bypass Strapi RBAC.
 */
async function getAuthUser(ctx) {
  const authHeader = ctx.request.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "").trim();
  try {
    const jwtService = strapi.plugin("users-permissions").service("jwt");
    const payload = await jwtService.verify(token);
    const user = await strapi.entityService.findOne(
      "plugin::users-permissions.user",
      payload.id,
      { populate: [] },
    );
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Verify caller is superadmin, returns the full user record or null.
 */
async function getSuperAdminCaller(ctx) {
  const caller = await getAuthUser(ctx);
  if (!caller) return null;

  const callerWithRole = await strapi.db
    .query("plugin::users-permissions.user")
    .findOne({ where: { id: caller.id }, populate: ["role"] });

  if (callerWithRole?.role?.type !== "superadmin") return null;
  return callerWithRole;
}

module.exports = {
  /**
   * GET /api/super-admin/users
   */
  async listUsers(ctx) {
    const caller = await getSuperAdminCaller(ctx);
    if (!caller) return ctx.unauthorized("Not logged in or not super admin");

    const users = await strapi.db
      .query("plugin::users-permissions.user")
      .findMany({ populate: ["role"], orderBy: { createdAt: "asc" } });

    const sanitized = users.map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      confirmed: u.confirmed,
      blocked: u.blocked,
      createdAt: u.createdAt,
      provider: u.provider,
      role: u.role
        ? { id: u.role.id, name: u.role.name, type: u.role.type }
        : null,
    }));

    return ctx.send({ data: sanitized });
  },

  /**
   * POST /api/super-admin/impersonate/:userId
   */
  async impersonate(ctx) {
    const caller = await getSuperAdminCaller(ctx);
    if (!caller) return ctx.unauthorized("Not logged in or not super admin");

    const targetUserId = parseInt(ctx.params.userId, 10);
    if (!targetUserId || isNaN(targetUserId)) {
      return ctx.badRequest("Invalid user ID");
    }

    const targetUser = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id: targetUserId }, populate: ["role"] });

    if (!targetUser) return ctx.notFound("Target user not found");
    if (targetUser?.role?.type === "superadmin") {
      return ctx.forbidden("Cannot impersonate another super admin");
    }

    const jwt = strapi.plugins["users-permissions"].services.jwt.issue({
      id: targetUser.id,
    });

    return ctx.send({
      jwt,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        email: targetUser.email,
      },
    });
  },

  /**
   * GET /api/super-admin/generate-requests
   */
  async listGenerateRequests(ctx) {
    const caller = await getSuperAdminCaller(ctx);
    if (!caller) return ctx.unauthorized("Not logged in or not super admin");

    const requests = await strapi.db
      .query("api::generate-request.generate-request")
      .findMany({ populate: ["user"], orderBy: { requestedAt: "desc" } });

    const sanitized = requests.map((r: any) => ({
      id: r.id,
      documentId: r.documentId,
      status: r.status,
      requestedAt: r.requestedAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      user: r.user
        ? { id: r.user.id, username: r.user.username, email: r.user.email }
        : null,
    }));

    return ctx.send({ data: sanitized });
  },

  /**
   * POST /api/super-admin/generate-requests/:id/approve
   */
  async approveRequest(ctx) {
    const caller = await getSuperAdminCaller(ctx);
    if (!caller) return ctx.unauthorized("Not logged in or not super admin");

    const requestId = parseInt(ctx.params.id, 10);
    if (!requestId || isNaN(requestId)) return ctx.badRequest("Invalid ID");

    const updated = await strapi.db
      .query("api::generate-request.generate-request")
      .update({
        where: { id: requestId },
        data: {
          status: "approved",
          reviewedAt: new Date().toISOString(),
          reviewedBy: caller.username,
        },
      });

    return ctx.send({ data: updated });
  },

  /**
   * POST /api/super-admin/generate-requests/:id/deny
   */
  async denyRequest(ctx) {
    const caller = await getSuperAdminCaller(ctx);
    if (!caller) return ctx.unauthorized("Not logged in or not super admin");

    const requestId = parseInt(ctx.params.id, 10);
    if (!requestId || isNaN(requestId)) return ctx.badRequest("Invalid ID");

    const updated = await strapi.db
      .query("api::generate-request.generate-request")
      .update({
        where: { id: requestId },
        data: {
          status: "denied",
          reviewedAt: new Date().toISOString(),
          reviewedBy: caller.username,
        },
      });

    return ctx.send({ data: updated });
  },
};
