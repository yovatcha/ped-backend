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
        sort: { id: 'desc' },
      };
    
      const { results, pagination } = await strapi
        .service('api::store.store')
        .find(queryForService);
    
      const uniqueResults = [];
      const seenDocIds = new Set();
      
      for (const store of results) {
        if (!seenDocIds.has(store.documentId)) {
          seenDocIds.add(store.documentId);
          uniqueResults.push(store);
        }
      }
    
      const sanitizedResults = await this.sanitizeOutput(uniqueResults, ctx);
    
      return this.transformResponse(sanitizedResults, { pagination });
    },

    async findOne(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Not logged in');
    
      const { id: documentId } = ctx.params;
    
      const existingStores = await strapi.db.query('api::store.store').findMany({
        where: { documentId },
        populate: ['agent'],
        limit: 1,
      });
    
      const existingStore = existingStores[0];
    
      if (!existingStore || existingStore.agent?.id !== user.id) {
        return ctx.notFound('Store not found or unauthorized');
      }
    
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);
    
      const entity = await strapi.entityService.findOne('api::store.store', existingStore.id, sanitizedQuery);
    
      const sanitized = await this.sanitizeOutput(entity, ctx);
      return this.transformResponse(sanitized);
    },

    async create(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Not logged in');
      
      const incomingData = ctx.request.body?.data || {};
      
      const { agent, vouchers, id, documentId, ...cleanData } = incomingData;
      
      const newStore = await strapi.entityService.create('api::store.store', {
        data: {
          ...cleanData,
          agent: user.id,
        },
      });
      
      const sanitized = await this.sanitizeOutput(newStore, ctx);
      console.log("🎁 Returning sanitized store - id:", (sanitized as any).id);
      
      return this.transformResponse(sanitized);
    },

    async update(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Not logged in');

      const { id: documentId } = ctx.params;

      const existingStores = await strapi.db.query('api::store.store').findMany({
        where: { documentId },
        populate: ['agent'],
        limit: 1,
      });

      const existingStore = existingStores[0];

      if (!existingStore || existingStore.agent?.id !== user.id) {
        return ctx.unauthorized('You can only update your own stores');
      }

      const incomingData = ctx.request.body?.data || {};
      
      const { agent, vouchers, id: _, documentId: __, ...cleanData } = incomingData;
      
      const updated = await strapi.entityService.update('api::store.store', existingStore.id, {
        data: cleanData,
      });
      
      await this.validateQuery(ctx);
      const sanitizedQuery = await this.sanitizeQuery(ctx);
      
      const updatedStore = await strapi.entityService.findOne('api::store.store', existingStore.id, sanitizedQuery);
      
      const sanitized = await this.sanitizeOutput(updatedStore, ctx);
      if (sanitized && typeof sanitized === 'object' && 'storeName' in sanitized) {
        console.log('🎁 Sanitized output - storeName:', (sanitized as any).storeName);
      } else {
        console.log('🎁 Sanitized output - storeName: <unknown>');
      }
      
      return this.transformResponse(sanitized);
    },

    async delete(ctx) {
      const user = ctx.state.user;
      if (!user) return ctx.unauthorized('Not logged in');

      const { id: documentId } = ctx.params;

      const existingStores = await strapi.db.query('api::store.store').findMany({
        where: { documentId },
        populate: ['agent'],
        limit: 1,
      });

      const existingStore = existingStores[0];

      if (!existingStore || existingStore.agent?.id !== user.id) {
        return ctx.unauthorized('You can only delete your own stores');
      }

      const deletedStore = await strapi.entityService.delete('api::store.store', existingStore.id);
      
      const sanitized = await this.sanitizeOutput(deletedStore, ctx);
      return this.transformResponse(sanitized);
    }
  })
);