// src/api/generation/controllers/generation.js

'use strict';

module.exports = {
  async callback(ctx) {
    try {
      const { requestId, status, generatedImages, error } = ctx.request.body;

      console.log('📬 Received callback from n8n:', { requestId, status });

      if (!requestId) {
        ctx.status = 400;
        return ctx.body = { success: false, error: 'requestId is required' };
      }

      // Validate status
      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (status && !validStatuses.includes(status)) {
        ctx.status = 400;
        return ctx.body = { success: false, error: 'Invalid status value' };
      }

      // Find existing generation record
      const existingGenerations = await strapi.documents('api::generation.generation').findMany({
        filters: { requestId: { $eq: requestId } },
      });

      const existingGeneration = existingGenerations[0];

      if (existingGeneration) {
        // Update existing
        await strapi.documents('api::generation.generation').update({
          documentId: existingGeneration.documentId,
          data: {
            status: status || existingGeneration.status,
            generatedImages: generatedImages || existingGeneration.generatedImages,
            error: error || null,
            completedAt: status === 'completed' ? new Date().toISOString() : null,
          },
        });
        console.log('✅ Generation updated:', requestId);
      } else {
        // Create new
        await strapi.documents('api::generation.generation').create({
          data: {
            requestId,
            status: status || 'pending',
            generatedImages: generatedImages || [],
            error: error || null,
            completedAt: status === 'completed' ? new Date().toISOString() : null,
          },
        });
        console.log('✅ Generation created:', requestId);
      }

      ctx.body = {
        success: true,
        message: 'Callback received',
        requestId,
      };
    } catch (error) {
      console.error('❌ Callback error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },

  async status(ctx) {
    try {
      const { requestId } = ctx.params;

      if (!requestId) {
        ctx.status = 400;
        return ctx.body = { success: false, error: 'requestId is required' };
      }

      const generations = await strapi.documents('api::generation.generation').findMany({
        filters: { requestId: { $eq: requestId } },
      });

      const generation = generations[0];

      if (!generation) {
        ctx.status = 404;
        return ctx.body = { 
          success: false, 
          error: 'Generation not found',
          requestId 
        };
      }

      ctx.body = {
        success: true,
        requestId: generation.requestId,
        status: generation.status,
        generatedImages: generation.generatedImages || [],
        error: generation.error,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt,
      };
    } catch (error) {
      console.error('❌ Status check error:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },
};