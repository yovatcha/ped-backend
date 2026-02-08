// src/api/generation/controllers/generation.js

"use strict";

interface GeneratedImage {
  type: string;
  url: string;
  name: string;
  collectionIndex?: number;
  couponIndex?: number;
  source?: string;
  [key: string]: any; // Index signature for JSONObject compatibility
}

module.exports = {
  async callback(ctx) {
    try {
      const requestBody = ctx.request.body;

      console.log(
        "📬 Received callback:",
        JSON.stringify(requestBody, null, 2),
      );

      // NEW: Handle the array structure from n8n
      let parsedData = requestBody;

      // If body is an array, get the first item
      if (Array.isArray(requestBody) && requestBody.length > 0) {
        parsedData = requestBody[0];
      }

      const {
        requestId,
        method,
        data: collectionsData,
        status,
        generatedImages,
        imageUrl,
        imageUrls,
        error,
        ...otherFields
      } = parsedData as Record<string, any>;

      if (!requestId) {
        ctx.status = 400;
        return (ctx.body = { success: false, error: "requestId is required" });
      }

      // Normalize status
      const validStatuses = [
        "pending",
        "processing",
        "completed",
        "failed",
        "success",
      ];
      const normalizedStatus = status === "success" ? "completed" : status;

      if (normalizedStatus && !validStatuses.includes(normalizedStatus)) {
        ctx.status = 400;
        return (ctx.body = { success: false, error: "Invalid status value" });
      }

      let normalizedImages = [];

      // ✅ NEW: Handle the new JSON structure with collections data
      if (
        method === "create" &&
        collectionsData &&
        Array.isArray(collectionsData)
      ) {
        console.log("🆕 Processing new JSON structure with collections");

        // Extract all images from the collections data
        collectionsData.forEach((collection) => {
          // Add collection image
          if (collection.collection_url) {
            normalizedImages.push({
              type: "collection",
              url: collection.collection_url,
              name: `Collection ${collection.collection_id}`,
              collectionIndex: collection.collection_id,
              source: collection.collection_source || "generated",
            });
          }

          // Add coupon images
          if (collection.coupons && Array.isArray(collection.coupons)) {
            collection.coupons.forEach((coupon) => {
              if (coupon.coupon_url) {
                // Parse coupon_id to get collection and coupon indices
                const [collIdx, cpIdx] = coupon.coupon_id
                  .split(".")
                  .map(Number);

                normalizedImages.push({
                  type: "coupon",
                  url: coupon.coupon_url,
                  name: `Coupon ${cpIdx} (Collection ${collIdx})`,
                  collectionIndex: collIdx,
                  couponIndex: cpIdx,
                  source: coupon.coupon_source || "generated",
                });
              }
            });
          }
        });

        console.log(
          `📸 Extracted ${normalizedImages.length} images from JSON structure`,
        );
      }
      // Handle existing formats (fallback)
      else if (generatedImages && Array.isArray(generatedImages)) {
        normalizedImages = generatedImages;
      } else if (imageUrl) {
        normalizedImages = [
          {
            type: "generated",
            url: imageUrl,
            name: "Generated Image",
          },
        ];
      } else if (imageUrls && Array.isArray(imageUrls)) {
        normalizedImages = imageUrls.map((url, index) => ({
          type: "generated",
          url: url,
          name: `Generated Image ${index + 1}`,
        }));
      }

      // Handle collection/coupon format (old format - keep for compatibility)
      const collectionCouponImages = [];

      // Add voucher image
      if (otherFields.voucherImageUrl) {
        collectionCouponImages.push({
          type: "voucher",
          url: otherFields.voucherImageUrl,
          name: "Generated Voucher",
        });
      }

      // Parse collection URLs (collection1_url, collection2_url, ...)
      Object.keys(otherFields).forEach((key) => {
        if (key.match(/^collection\d+_url$/)) {
          const collectionNum = key.match(/collection(\d+)_url/)[1];
          collectionCouponImages.push({
            type: "collection",
            url: otherFields[key],
            name: `Collection ${collectionNum}`,
            collectionIndex: parseInt(collectionNum),
          });
        } else if (key.match(/^coupon\d+_\d+_url$/)) {
          const match = key.match(/coupon(\d+)_(\d+)_url/);
          const collectionNum = match[1];
          const couponNum = match[2];
          collectionCouponImages.push({
            type: "coupon",
            url: otherFields[key],
            name: `Coupon ${couponNum} (Collection ${collectionNum})`,
            collectionIndex: parseInt(collectionNum),
            couponIndex: parseInt(couponNum),
          });
        }
      });

      // Use collection/coupon images if present (from old format)
      if (collectionCouponImages.length > 0 && normalizedImages.length === 0) {
        normalizedImages = collectionCouponImages;
      }

      console.log("📸 Final normalized images:", normalizedImages.length);

      // Find existing generation record
      const existingGenerations = await strapi
        .documents("api::generation.generation")
        .findMany({
          filters: { requestId: { $eq: requestId } },
        });

      const existingGeneration = existingGenerations[0];

      if (existingGeneration) {
        // ✅ IMPORTANT: Merge with existing images instead of replacing
        const existingImages = Array.isArray(existingGeneration.generatedImages)
          ? existingGeneration.generatedImages
          : [];
        const mergedImages: GeneratedImage[] = [
          ...(existingImages as unknown as GeneratedImage[]),
        ];

        // Add new images, avoiding duplicates based on URL
        normalizedImages.forEach((newImg) => {
          const exists = mergedImages.some(
            (existing) => existing.url === newImg.url,
          );
          if (!exists) {
            mergedImages.push(newImg);
          }
        });

        const updateData = {
          status: normalizedStatus || existingGeneration.status,
          generatedImages: mergedImages,
          error: error || null,
          completedAt:
            normalizedStatus === "completed" ? new Date().toISOString() : null,
        };

        await strapi.documents("api::generation.generation").update({
          documentId: existingGeneration.documentId,
          data: updateData as any,
        });
        console.log(
          `✅ Generation updated: ${requestId} (${mergedImages.length} total images)`,
        );
      } else {
        await strapi.documents("api::generation.generation").create({
          data: {
            requestId,
            status: normalizedStatus || "completed", // Default to completed for new records
            generatedImages: normalizedImages,
            error: error || null,
            completedAt: new Date().toISOString(),
          },
        });
        console.log(
          `✅ Generation created: ${requestId} (${normalizedImages.length} images)`,
        );
      }

      ctx.body = {
        success: true,
        message: "Callback received",
        requestId,
        imagesReceived: normalizedImages.length,
      };
    } catch (error) {
      console.error("❌ Callback error:", error);
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
        return (ctx.body = { success: false, error: "requestId is required" });
      }

      const generations = await strapi
        .documents("api::generation.generation")
        .findMany({
          filters: { requestId: { $eq: requestId } },
        });

      const generation = generations[0];

      if (!generation) {
        ctx.status = 404;
        return (ctx.body = {
          success: false,
          error: "Generation not found",
          requestId,
        });
      }

      ctx.body = {
        success: true,
        requestId: generation.requestId,
        status: generation.status,
        generatedImages: generation.generatedImages || [],
        error: generation.error,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt,
        ...(generation.aiData && { aiData: generation.aiData }),
      };
    } catch (error) {
      console.error("❌ Status check error:", error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },
};
