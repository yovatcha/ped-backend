import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::store.store',
  ({ strapi }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Not logged in');

      // 1) Sanitize the incoming query first
      await this.validateQuery(ctx); // optional but recommended
      const sanitizedQuery = await this.sanitizeQuery(ctx); // [[Sanitization & validation](https://docs.strapi.io/cms/backend-customization/controllers#sanitization-and-validation-in-controllers)]

      // 2) Force agent filter so each user only sees their stores
      const incomingFilters = (sanitizedQuery.filters ?? {}) as Record<string, any>;

      const filters = {
        ...incomingFilters,
        agent: {
          $eq: user.id,
        },
      };

      const queryForService = {
        ...sanitizedQuery,
        filters,
        populate: ['vouchers'], // you can also merge with existing populate if needed
      };

      const { results, pagination } = await strapi
        .service('api::store.store')
        .find(queryForService);

      const sanitizedResults = await this.sanitizeOutput(results, ctx);

      return this.transformResponse(sanitizedResults, { pagination });
    },

    async create(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Not logged in');

      const incomingData = ctx.request.body?.data || {};

      ctx.request.body = {
        data: {
          ...incomingData,
          agent: user.id,
        },
      };

      return await super.create(ctx);
    },
  })
);