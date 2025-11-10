import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::store.store", ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized("Not logged in");

    const filters = (ctx.query?.filters || {}) as Record<string, any>;

    ctx.query = {
      ...ctx.query,
      filters: {
        ...filters,
        agent: {
          id: user.id
        }
      },
      populate: ["vouchers"],
    };

    return await super.find(ctx);
  },

  async create(ctx) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized("Not logged in");

    // Log what we're receiving
    console.log("Original request body:", JSON.stringify(ctx.request.body, null, 2));

    const data = ctx.request.body?.data || {};

    // Build new body
    const newBody = {
      data: {
        ...data,
        agent: user.id,
      }
    };

    console.log("Modified request body:", JSON.stringify(newBody, null, 2));

    // Replace the entire body
    ctx.request.body = newBody;

    return await super.create(ctx);
  },
}));