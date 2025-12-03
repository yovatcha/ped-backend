import { factories } from "@strapi/strapi";

export default factories.createCoreController(
  "api::store.store",
  ({ strapi }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("Not logged in");

      const incomingFilters = (ctx.query.filters ?? {}) as Record<string, any>;

      ctx.query = {
        ...ctx.query,
        filters: {
          ...incomingFilters,
          agent: {
            $eq: user.id,
          },
        },
        populate: ["vouchers"],
      };

      return await super.find(ctx);
    },

    async create(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized("Not logged in");

      const incomingData = ctx.request.body?.data || {};

      ctx.request.body = {
        data: {
          ...incomingData,
          agent: user.id, // v5 relation assignment
        },
      };

      return await super.create(ctx);
    },
  })
);
