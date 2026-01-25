// src/api/generation/controllers/generation.js

'use strict';

module.exports = {
  // Existing callback function
  async callback(ctx) {
    try {
      const { requestId, status, generatedImages, imageUrl, imageUrls, error } = ctx.request.body;

      console.log('📬 Received callback from n8n:', JSON.stringify(ctx.request.body, null, 2));

      if (!requestId) {
        ctx.status = 400;
        return ctx.body = { success: false, error: 'requestId is required' };
      }

      const validStatuses = ['pending', 'processing', 'completed', 'failed'];
      if (status && !validStatuses.includes(status)) {
        ctx.status = 400;
        return ctx.body = { success: false, error: 'Invalid status value' };
      }

      let normalizedImages = [];

      if (generatedImages && Array.isArray(generatedImages)) {
        normalizedImages = generatedImages;
      } else if (imageUrl) {
        normalizedImages = [{ 
          type: 'generated', 
          url: imageUrl,
          name: 'Generated Image'
        }];
      } else if (imageUrls && Array.isArray(imageUrls)) {
        normalizedImages = imageUrls.map((url, index) => ({
          type: 'generated',
          url: url,
          name: `Generated Image ${index + 1}`
        }));
      }

      console.log('📸 Normalized images:', normalizedImages);

      const existingGenerations = await strapi.documents('api::generation.generation').findMany({
        filters: { requestId: { $eq: requestId } },
      });

      const existingGeneration = existingGenerations[0];

      if (existingGeneration) {
        const updated = await strapi.documents('api::generation.generation').update({
          documentId: existingGeneration.documentId,
          data: {
            status: status || existingGeneration.status,
            generatedImages: normalizedImages.length > 0 ? normalizedImages : existingGeneration.generatedImages,
            error: error || null,
            completedAt: status === 'completed' ? new Date().toISOString() : null,
          },
        });
        console.log('✅ Generation updated:', requestId);
      } else {
        const created = await strapi.documents('api::generation.generation').create({
          data: {
            requestId,
            status: status || 'pending',
            generatedImages: normalizedImages,
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

  // Existing status function
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

  // NEW: Upload from URL function
  // async uploadFromUrl(ctx) {
  //   try {
  //     const { imageUrl, filename } = ctx.request.body;

  //     console.log('📥 Upload from URL request:', { imageUrl, filename });

  //     if (!imageUrl || !filename) {
  //       ctx.status = 400;
  //       return ctx.body = { 
  //         success: false, 
  //         error: 'Missing imageUrl or filename' 
  //       };
  //     }

  //     console.log('🔄 Fetching image from:', imageUrl);
  //     const response = await fetch(imageUrl);
      
  //     if (!response.ok) {
  //       throw new Error(`Failed to fetch image: ${response.statusText}`);
  //     }

  //     const arrayBuffer = await response.arrayBuffer();
  //     const buffer = Buffer.from(arrayBuffer);
  //     const contentType = response.headers.get('content-type') || 'image/png';

  //     console.log('📦 Image fetched:', {
  //       size: buffer.length,
  //       contentType,
  //       filename,
  //     });

  //     const uploadService = strapi.plugin('upload').service('upload');
      
  //     const uploadedFiles = await uploadService.upload({
  //       data: {},
  //       files: {
  //         path: buffer,
  //         name: filename,
  //         type: contentType,
  //         size: buffer.length,
  //       },
  //     });

  //     console.log('✅ Image uploaded to Strapi:', uploadedFiles[0].url);

  //     ctx.body = uploadedFiles[0];
  //   } catch (error) {
  //     console.error('❌ Upload from URL error:', error);
  //     ctx.status = 500;
  //     ctx.body = {
  //       success: false,
  //       error: `Failed to upload image: ${error.message}`,
  //     };
  //   }
  // },
};