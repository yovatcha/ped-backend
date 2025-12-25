import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::store.store',
  ({ strapi }) => ({
    async find(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Not logged in');

      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);

      const incomingFilters = (sanitizedQuery.filters ?? {}) as Record<string, any>;

      const filters = {
        ...incomingFilters,
        agent: {
          $eq: user.id,
        },
      };

      // ✅ CRITICAL FIX: Pass through the entire sanitizedQuery
      const queryForService = {
        ...sanitizedQuery,
        filters,
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
      
      console.log("Creating store for user:", user.id);
      
      const incomingData = ctx.request.body?.data || {};
      
      const { agent, vouchers, id, documentId, ...cleanData } = incomingData;
      
      const newStore = await strapi.entityService.create('api::store.store', {
        data: {
          ...cleanData,
          agent: user.id,
        },
      });
      
      const sanitized = await this.sanitizeOutput(newStore, ctx);
      return this.transformResponse(sanitized);
    }
  })
);