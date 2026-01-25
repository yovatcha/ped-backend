// src/api/generation/controllers/generation.js

'use strict';

module.exports = {
  async callback(ctx) {
    try {
      const requestBody = ctx.request.body;
      const { requestId, status, generatedImages, imageUrl, imageUrls, error, ...otherFields } = requestBody;

      console.log('📬 Received callback from n8n:', JSON.stringify(requestBody, null, 2));

      if (!requestId) {
        ctx.status = 400;
        return ctx.body = { success: false, error: 'requestId is required' };
      }

      // Normalize status: "success" -> "completed"
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'success'];
      const normalizedStatus = status === 'success' ? 'completed' : status;
      
      if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
        ctx.status = 400;
        return ctx.body = { success: false, error: 'Invalid status value' };
      }

      let normalizedImages = [];

      // Handle existing image formats (Step 1: Initial voucher generation)
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

      // NEW: Handle collection/coupon format (Step 2: Collection/Coupon generation)
      const collectionCouponImages = [];
      
      // Add voucher image if present
      if (otherFields.voucherImageUrl) {
        collectionCouponImages.push({
          type: 'voucher',
          url: otherFields.voucherImageUrl,
          name: 'Generated Voucher'
        });
      }

      // Parse dynamic collection URLs (collection1_url, collection2_url, ...)
      Object.keys(otherFields).forEach(key => {
        if (key.match(/^collection\d+_url$/)) {
          const collectionNum = key.match(/collection(\d+)_url/)[1];
          collectionCouponImages.push({
            type: 'collection',
            url: otherFields[key],
            name: `Collection ${collectionNum}`,
            collectionIndex: parseInt(collectionNum)
          });
        } else if (key.match(/^coupon\d+_\d+_url$/)) {
          // Parse coupon URLs (coupon1_1_url, coupon1_2_url, coupon2_1_url, ...)
          const match = key.match(/coupon(\d+)_(\d+)_url/);
          const collectionNum = match[1];
          const couponNum = match[2];
          collectionCouponImages.push({
            type: 'coupon',
            url: otherFields[key],
            name: `Coupon ${couponNum} (Collection ${collectionNum})`,
            collectionIndex: parseInt(collectionNum),
            couponIndex: parseInt(couponNum)
          });
        }
      });

      // Parse AI analysis data
      const aiData: { description?: string; analysis?: string } = {};
      if (otherFields.ai_description) {
        aiData.description = otherFields.ai_description;
      }
      if (otherFields.ai_analyze) {
        aiData.analysis = otherFields.ai_analyze;
      }

      // Use collection/coupon images if present, otherwise use normal images
      if (collectionCouponImages.length > 0) {
        normalizedImages = collectionCouponImages;
      }

      console.log('📸 Normalized images:', normalizedImages);
      if (Object.keys(aiData).length > 0) {
        console.log('🤖 AI Data:', aiData);
      }

      // Find existing generation record
      const existingGenerations = await strapi.documents('api::generation.generation').findMany({
        filters: { requestId: { $eq: requestId } },
      });

      const existingGeneration = existingGenerations[0];

      if (existingGeneration) {
        // Update existing record
        const updated = await strapi.documents('api::generation.generation').update({
          documentId: existingGeneration.documentId,
          data: {
            status: normalizedStatus || existingGeneration.status,
            generatedImages: normalizedImages.length > 0 ? normalizedImages : existingGeneration.generatedImages,
            error: error || null,
            // Only include aiData if new AI data is present
            ...(Object.keys(aiData).length > 0 ? { aiData } : {}),
            completedAt: normalizedStatus === 'completed' ? new Date().toISOString() : null,
          },
        });
        console.log('✅ Generation updated:', requestId);
      } else {
        // Create new record
        const created = await strapi.documents('api::generation.generation').create({
          data: {
            requestId,
            status: normalizedStatus || 'pending',
            generatedImages: normalizedImages,
            error: error || null,
            aiData: Object.keys(aiData).length > 0 ? aiData : undefined,
            completedAt: normalizedStatus === 'completed' ? new Date().toISOString() : null,
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
        // aiData property may not exist on generation, so check and include if present
        ...(generation.hasOwnProperty('aiData') ? { aiData: (generation as any).aiData } : {}),
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