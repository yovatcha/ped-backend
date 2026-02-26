"use strict";

module.exports = {
  /**
   * GET /api/super-admin/users
   * Returns all users (id, username, email, role).
   * Only callable by a user whose role type === 'superadmin'.
   */
  async listUsers(ctx) {
    const caller = ctx.state.user;
    if (!caller) return ctx.unauthorized("Not logged in");

    // Verify caller has superadmin role
    const callerWithRole = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { id: caller.id },
        populate: ["role"],
      });

    if (callerWithRole?.role?.type !== "superadmin") {
      return ctx.forbidden("Super admin access required");
    }

    // Fetch all users
    const users = await strapi.db
      .query("plugin::users-permissions.user")
      .findMany({
        populate: ["role"],
        orderBy: { createdAt: "asc" },
      });

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
   * Issues a JWT for the target user so the super admin can act as them.
   */
  async impersonate(ctx) {
    const caller = ctx.state.user;
    if (!caller) return ctx.unauthorized("Not logged in");

    // Verify caller has superadmin role
    const callerWithRole = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { id: caller.id },
        populate: ["role"],
      });

    if (callerWithRole?.role?.type !== "superadmin") {
      return ctx.forbidden("Super admin access required");
    }

    const targetUserId = parseInt(ctx.params.userId, 10);
    if (!targetUserId || isNaN(targetUserId)) {
      return ctx.badRequest("Invalid user ID");
    }

    // Fetch target user
    const targetUser = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({
        where: { id: targetUserId },
        populate: ["role"],
      });

    if (!targetUser) {
      return ctx.notFound("Target user not found");
    }

    // Prevent impersonating another superadmin
    if (targetUser?.role?.type === "superadmin") {
      return ctx.forbidden("Cannot impersonate another super admin");
    }

    // Issue JWT for the target user
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
   * List all generate-access requests with user info.
   */
  async listGenerateRequests(ctx) {
    const caller = ctx.state.user;
    if (!caller) return ctx.unauthorized("Not logged in");

    const callerWithRole = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id: caller.id }, populate: ["role"] });

    if (callerWithRole?.role?.type !== "superadmin") {
      return ctx.forbidden("Super admin access required");
    }

    const requests = await strapi.db
      .query("api::generate-request.generate-request")
      .findMany({
        populate: ["user"],
        orderBy: { requestedAt: "desc" },
      });

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
    const caller = ctx.state.user;
    if (!caller) return ctx.unauthorized("Not logged in");

    const callerWithRole = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id: caller.id }, populate: ["role"] });

    if (callerWithRole?.role?.type !== "superadmin") {
      return ctx.forbidden("Super admin access required");
    }

    const requestId = parseInt(ctx.params.id, 10);
    if (!requestId || isNaN(requestId)) return ctx.badRequest("Invalid ID");

    const updated = await strapi.db
      .query("api::generate-request.generate-request")
      .update({
        where: { id: requestId },
        data: {
          status: "approved",
          reviewedAt: new Date().toISOString(),
          reviewedBy: callerWithRole.username,
        },
      });

    return ctx.send({ data: updated });
  },

  /**
   * POST /api/super-admin/generate-requests/:id/deny
   */
  async denyRequest(ctx) {
    const caller = ctx.state.user;
    if (!caller) return ctx.unauthorized("Not logged in");

    const callerWithRole = await strapi.db
      .query("plugin::users-permissions.user")
      .findOne({ where: { id: caller.id }, populate: ["role"] });

    if (callerWithRole?.role?.type !== "superadmin") {
      return ctx.forbidden("Super admin access required");
    }

    const requestId = parseInt(ctx.params.id, 10);
    if (!requestId || isNaN(requestId)) return ctx.badRequest("Invalid ID");

    const updated = await strapi.db
      .query("api::generate-request.generate-request")
      .update({
        where: { id: requestId },
        data: {
          status: "denied",
          reviewedAt: new Date().toISOString(),
          reviewedBy: callerWithRole.username,
        },
      });

    return ctx.send({ data: updated });
  },
};
