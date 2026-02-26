"use strict";

/**
 * Manually resolves the authenticated user from the Bearer token.
 * Needed because these routes use auth: false to bypass Strapi RBAC,
 * which means ctx.state.user is not auto-populated.
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

module.exports = {
  /**
   * GET /api/generate-request/my-status
   * Returns the current user's latest generate-request, or null.
   */
  async getMyStatus(ctx) {
    const user = await getAuthUser(ctx);
    if (!user) return ctx.unauthorized("Not logged in");

    const request = await strapi.db
      .query("api::generate-request.generate-request")
      .findOne({
        where: { user: { id: user.id } },
        orderBy: { requestedAt: "desc" },
        populate: ["user"],
      });

    return ctx.send({ data: request ?? null });
  },

  /**
   * POST /api/generate-request/submit
   * Creates (or returns existing) a pending/approved generate-request.
   * If the last request was denied, creates a new one.
   */
  async submitRequest(ctx) {
    const user = await getAuthUser(ctx);
    if (!user) return ctx.unauthorized("Not logged in");

    // Look for an existing non-denied request
    const existing = await strapi.db
      .query("api::generate-request.generate-request")
      .findOne({
        where: { user: { id: user.id }, status: { $ne: "denied" } },
        orderBy: { requestedAt: "desc" },
      });

    if (existing) {
      return ctx.send({ data: existing });
    }

    // Create a new pending request
    const newRequest = await strapi.db
      .query("api::generate-request.generate-request")
      .create({
        data: {
          user: user.id,
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
      });

    return ctx.send({ data: newRequest });
  },
};
