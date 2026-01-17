// src/api/generation/controllers/generation.js

'use strict';

module.exports = {
  async callback(ctx) {
    try {
      const { requestId, status, generatedImages, imageUrl, imageUrls, error } = ctx.request.body;

      console.log('📬 Received callback from n8n:', JSON.stringify(ctx.request.body, null, 2));

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

      // Normalize images to array format
      // Handle multiple formats from n8n:
      // 1. generatedImages: [{ type, url }] - full format
      // 2. imageUrl: "string" - single image URL
      // 3. imageUrls: ["url1", "url2"] - array of URLs
      let normalizedImages = [];

      if (generatedImages && Array.isArray(generatedImages)) {
        // Already in correct format
        normalizedImages = generatedImages;
      } else if (imageUrl) {
        // Single image URL from n8n
        normalizedImages = [{ 
          type: 'generated', 
          url: imageUrl,
          name: `Generated Image`
        }];
      } else if (imageUrls && Array.isArray(imageUrls)) {
        // Array of image URLs
        normalizedImages = imageUrls.map((url, index) => ({
          type: 'generated',
          url: url,
          name: `Generated Image ${index + 1}`
        }));
      }

      console.log('📸 Normalized images:', normalizedImages);

      // Find existing generation record
      const existingGenerations = await strapi.documents('api::generation.generation').findMany({
        filters: { requestId: { $eq: requestId } },
      });

      const existingGeneration = existingGenerations[0];

      if (existingGeneration) {
        // Update existing
        const updated = await strapi.documents('api::generation.generation').update({
          documentId: existingGeneration.documentId,
          data: {
            status: status || existingGeneration.status,
            generatedImages: normalizedImages.length > 0 ? normalizedImages : existingGeneration.generatedImages,
            error: error || null,
            completedAt: status === 'completed' ? new Date().toISOString() : null,
          },
        });
        console.log('✅ Generation updated:', requestId, updated);
      } else {
        // Create new
        const created = await strapi.documents('api::generation.generation').create({
          data: {
            requestId,
            status: status || 'pending',
            generatedImages: normalizedImages,
            error: error || null,
            completedAt: status === 'completed' ? new Date().toISOString() : null,
          },
        });
        console.log('✅ Generation created:', requestId, created);
      }

      ctx.body = {
        success: true,
        message: 'Callback received',
        requestId,
        imagesReceived: normalizedImages.length,
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