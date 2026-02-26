"use strict";

/**
 * Manually resolves the authenticated user from the Bearer token.
 * Needed because these routes use auth: false to bypass Strapi RBAC,
 * which means ctx.state.user is not auto-populated.
 */
export async function getAuthUser(ctx) {
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
