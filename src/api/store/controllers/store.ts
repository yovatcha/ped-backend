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

      const queryForService = {
        ...sanitizedQuery,
        filters,
        populate: ['vouchers'],
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
      
      // ✅ Don't modify ctx.request.body - use entityService directly
      const incomingData = ctx.request.body?.data || {};
      
      // Remove fields that shouldn't be in the payload
      const { agent, vouchers, id, documentId, ...cleanData } = incomingData;
      
      // ✅ Use entityService.create to bypass sanitization
      const newStore = await strapi.entityService.create('api::store.store', {
        data: {
          ...cleanData,
          agent: user.id,  // Set the agent relation directly
        },
      });
      
      // Sanitize and return the response
      const sanitized = await this.sanitizeOutput(newStore, ctx);
      return this.transformResponse(sanitized);
    }
  })
);