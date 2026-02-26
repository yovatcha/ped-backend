// src/api/generation/controllers/generation.js

"use strict";

module.exports = {
  // src/api/generation/controllers/generation.js

  async callback(ctx) {
    try {
      const requestBody = ctx.request.body;
      const {
        requestId,
        status,
        generatedImages,
        imageUrl,
        imageUrls,
        error,
        ...otherFields
      } = requestBody;

      console.log(
        "📬 Received callback:",
        JSON.stringify(requestBody, null, 2),
      );

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

      // Handle legacy formats (for generate_voucher and image_preview actions)
      // These use simple imageUrl or imageUrls fields
      if (generatedImages && Array.isArray(generatedImages)) {
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

      // Handle collection/coupon format from n8n
      // Supports TWO formats:
      // 1. Legacy format (image_preview): collection1_url, coupon1_1_url
      // 2. New format (generate_all): collection1ImagePreview, coupon1_1ImagePreview
      const collectionCouponImages = [];

      // Add voucher image
      if (otherFields.voucherImagePreview) {
        collectionCouponImages.push({
          type: "voucher",
          url: otherFields.voucherImagePreview,
          name: "Generated Voucher",
        });
      } else if (otherFields.voucherImageUrl) {
        // Legacy format for image_preview
        collectionCouponImages.push({
          type: "voucher",
          url: otherFields.voucherImageUrl,
          name: "Generated Voucher",
        });
      }

      // Parse collection and coupon URLs from n8n
      Object.keys(otherFields).forEach((key) => {
        // New format: collection1ImagePreview, collection2ImagePreview, ..., collection5ImagePreview
        if (key.match(/^collection\d+ImagePreview$/)) {
          const collectionNum = key.match(/collection(\d+)ImagePreview/)[1];
          collectionCouponImages.push({
            type: "collection",
            url: otherFields[key],
            name:
              otherFields[`collection${collectionNum}Name`] ||
              `Collection ${collectionNum}`,
            collectionIndex: parseInt(collectionNum),
          });
        }
        // Legacy format: collection1_url, collection2_url, etc.
        else if (key.match(/^collection\d+_url$/)) {
          const collectionNum = key.match(/collection(\d+)_url/)[1];
          collectionCouponImages.push({
            type: "collection",
            url: otherFields[key],
            name:
              otherFields[`collection${collectionNum}_name`] ||
              `Collection ${collectionNum}`,
            collectionIndex: parseInt(collectionNum),
          });
        }
        // New format: coupon1_1ImagePreview, coupon1_2ImagePreview, ..., coupon5_5ImagePreview
        else if (key.match(/^coupon\d+_\d+ImagePreview$/)) {
          const match = key.match(/coupon(\d+)_(\d+)ImagePreview/);
          const collectionNum = match[1];
          const couponNum = match[2];
          collectionCouponImages.push({
            type: "coupon",
            url: otherFields[key],
            name:
              otherFields[`coupon${collectionNum}_${couponNum}Name`] ||
              `Coupon ${couponNum} (Collection ${collectionNum})`,
            collectionIndex: parseInt(collectionNum),
            couponIndex: parseInt(couponNum),
          });
        }
        // Legacy format: coupon1_1_url, coupon2_1_url, etc.
        else if (key.match(/^coupon\d+_\d+_url$/)) {
          const match = key.match(/coupon(\d+)_(\d+)_url/);
          const collectionNum = match[1];
          const couponNum = match[2];
          collectionCouponImages.push({
            type: "coupon",
            url: otherFields[key],
            name:
              otherFields[`coupon${collectionNum}_${couponNum}_name`] ||
              `Coupon ${couponNum} (Collection ${collectionNum})`,
            collectionIndex: parseInt(collectionNum),
            couponIndex: parseInt(couponNum),
          });
        }
      });

      // Use collection/coupon images if present
      if (collectionCouponImages.length > 0) {
        normalizedImages = collectionCouponImages;
      }

      console.log("📸 Normalized images:", normalizedImages);

      // Find or create generation record
      const existingGenerations = await strapi
        .documents("api::generation.generation")
        .findMany({
          filters: { requestId: { $eq: requestId } },
        });

      const existingGeneration = existingGenerations[0];

      if (existingGeneration) {
        const updateData = {
          status: normalizedStatus || existingGeneration.status,
          generatedImages:
            normalizedImages.length > 0
              ? normalizedImages
              : existingGeneration.generatedImages,
          error: error || null,
          completedAt:
            normalizedStatus === "completed" ? new Date().toISOString() : null,
        };

        await strapi.documents("api::generation.generation").update({
          documentId: existingGeneration.documentId,
          data: updateData,
        });
        console.log("✅ Generation updated:", requestId);
      } else {
        await strapi.documents("api::generation.generation").create({
          data: {
            requestId,
            status: normalizedStatus || "pending",
            generatedImages: normalizedImages,
            error: error || null,
            completedAt:
              normalizedStatus === "completed"
                ? new Date().toISOString()
                : null,
          },
        });
        console.log("✅ Generation created:", requestId);
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

      const responseBody = {
        success: true,
        requestId: generation.requestId,
        status: generation.status,
        generatedImages: generation.generatedImages || [],
        error: generation.error,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt,
      };

      // Include aiData if it exists and if responseBody allows extra fields
      if (Object.prototype.hasOwnProperty.call(generation, "aiData")) {
        (responseBody as Record<string, unknown>).aiData = generation.aiData;
      }

      ctx.body = responseBody;
    } catch (error) {
      console.error("\u274c Status check error:", error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * POST /api/generation/upload-from-url
   * Server-side proxy: downloads an external image URL and uploads it to Strapi
   * media library. Bypasses browser CORS restrictions entirely.
   */
  async uploadFromUrl(ctx) {
    const { writeFileSync, unlinkSync, existsSync } = require("fs");
    let tmpFilePath: string | null = null;

    try {
      const { url, filename } = ctx.request.body as {
        url: string;
        filename: string;
      };
      console.log(
        "[uploadFromUrl] Step 1 - received url:",
        url?.slice(0, 100),
        "filename:",
        filename,
      );

      if (!url) {
        ctx.status = 400;
        return (ctx.body = { success: false, error: "url is required" });
      }

      // Step 2: Download image server-side (no CORS)
      const imageRes = await fetch(url);
      console.log(
        "[uploadFromUrl] Step 2 - fetch status:",
        imageRes.status,
        "ok:",
        imageRes.ok,
      );
      if (!imageRes.ok) {
        ctx.status = 502;
        return (ctx.body = {
          success: false,
          error: `Failed to fetch image: ${imageRes.status}`,
        });
      }

      const arrayBuffer = await imageRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = imageRes.headers.get("content-type") || "image/png";
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const safeFilename = filename
        ? filename.replace(/[^a-zA-Z0-9._-]/g, "_")
        : `generated-${uniqueId}.png`;

      console.log(
        "[uploadFromUrl] Step 3 - buffer size:",
        buffer.length,
        "contentType:",
        contentType,
        "safeFilename:",
        safeFilename,
      );

      // Step 3: Write to /app/public/ which is volume-mounted and definitely writable
      tmpFilePath = `/app/public/tmp_upload_${uniqueId}.png`;
      console.log(
        "[uploadFromUrl] Step 4 - writing temp file to:",
        tmpFilePath,
      );
      writeFileSync(tmpFilePath, buffer);
      console.log(
        "[uploadFromUrl] Step 4 - temp file written, exists:",
        existsSync(tmpFilePath),
      );

      // Step 4: Upload via Strapi upload service
      console.log("[uploadFromUrl] Step 5 - calling strapi upload service");
      const uploadedFiles = await strapi
        .plugin("upload")
        .service("upload")
        .upload({
          data: {
            fileInfo: {
              name: safeFilename,
              alternativeText: "",
              caption: "",
            },
          },
          files: {
            path: tmpFilePath,
            name: safeFilename,
            type: contentType,
            size: buffer.length,
          },
        });

      console.log(
        "[uploadFromUrl] Step 5 - upload result count:",
        uploadedFiles?.length,
        "first id:",
        uploadedFiles?.[0]?.id,
      );

      const uploadedFile = uploadedFiles[0];
      ctx.body = {
        success: true,
        id: uploadedFile.id,
        url: uploadedFile.url,
        name: uploadedFile.name,
      };
    } catch (error) {
      console.error("[uploadFromUrl] ❌ Error:", error.message);
      console.error("[uploadFromUrl] Stack:", error.stack);
      ctx.status = 500;
      ctx.body = { success: false, error: error.message };
    } finally {
      if (tmpFilePath) {
        try {
          unlinkSync(tmpFilePath);
        } catch (_) {}
      }
    }
  },
};
