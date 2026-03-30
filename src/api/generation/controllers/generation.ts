// src/api/generation/controllers/generation.ts

"use strict";

module.exports = {
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
      const collectionCouponImages = [];

      // Add voucher image
      if (otherFields.voucherImagePreview) {
        collectionCouponImages.push({
          type: "voucher",
          url: otherFields.voucherImagePreview,
          name: "Generated Voucher",
        });
      } else if (otherFields.voucherImageUrl) {
        collectionCouponImages.push({
          type: "voucher",
          url: otherFields.voucherImageUrl,
          name: "Generated Voucher",
        });
      }

      // Parse collection and coupon URLs from n8n
      Object.keys(otherFields).forEach((key) => {
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
        } else if (key.match(/^collection\d+_url$/)) {
          const collectionNum = key.match(/collection(\d+)_url/)[1];
          collectionCouponImages.push({
            type: "collection",
            url: otherFields[key],
            name:
              otherFields[`collection${collectionNum}_name`] ||
              `Collection ${collectionNum}`,
            collectionIndex: parseInt(collectionNum),
          });
        } else if (key.match(/^coupon\d+_\d+ImagePreview$/)) {
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
        } else if (key.match(/^coupon\d+_\d+_url$/)) {
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
        await strapi.documents("api::generation.generation").update({
          documentId: existingGeneration.documentId,
          data: {
            status: normalizedStatus || existingGeneration.status,
            generatedImages:
              normalizedImages.length > 0
                ? normalizedImages
                : existingGeneration.generatedImages,
            error: error || null,
            completedAt:
              normalizedStatus === "completed"
                ? new Date().toISOString()
                : null,
          },
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
      ctx.body = { success: false, error: error.message };
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

      if (Object.prototype.hasOwnProperty.call(generation, "aiData")) {
        (responseBody as Record<string, unknown>).aiData = generation.aiData;
      }

      ctx.body = responseBody;
    } catch (error) {
      console.error("❌ Status check error:", error);
      ctx.status = 500;
      ctx.body = { success: false, error: error.message };
    }
  },

  /**
   * POST /api/generation/upload-from-url
   * Downloads an external image URL server-side (bypassing browser CORS)
   * then re-uploads it to Strapi via a loopback HTTP POST to /api/upload.
   * No filesystem operations — works entirely in memory (Node 18+ FormData + Blob).
   *
   * Body: { url, filename, token }
   * Returns: { id, url, name }
   */
  async uploadFromUrl(ctx) {
    try {
      const { url, filename } = ctx.request.body as {
        url: string;
        filename: string;
      };

      // Read token from the Authorization header passed by the frontend
      const authHeader = ctx.request.headers.authorization as
        | string
        | undefined;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.replace("Bearer ", "").trim()
        : null;

      if (!url) {
        ctx.status = 400;
        return (ctx.body = { success: false, error: "url is required" });
      }
      if (!token) {
        ctx.status = 401;
        return (ctx.body = {
          success: false,
          error: "Authorization header is required",
        });
      }

      // Step 1: Download image server-side — no CORS restrictions in Node.js
      console.log("[uploadFromUrl] Downloading:", url.slice(0, 100));
      const imageRes = await fetch(url);
      if (!imageRes.ok) {
        ctx.status = 502;
        return (ctx.body = {
          success: false,
          error: `Failed to fetch image from source: ${imageRes.status}`,
        });
      }

      const arrayBuffer = await imageRes.arrayBuffer();
      const contentType = imageRes.headers.get("content-type") || "image/png";
      const safeFilename = (filename || `generated-${Date.now()}.png`).replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );
      console.log(
        "[uploadFromUrl] Downloaded",
        arrayBuffer.byteLength,
        "bytes as",
        contentType,
      );

      // Step 2: Re-upload via loopback POST to Strapi's own /api/upload endpoint.
      // FormData + Blob works in Node 18+ with no filesystem operations required.
      const blob = new Blob([arrayBuffer], { type: contentType });
      const form = new FormData();
      form.append("files", blob, safeFilename);

      const port = strapi.config.get("server.port", 1337);
      const uploadRes = await fetch(`http://localhost:${port}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Do NOT set Content-Type — fetch sets it automatically with the correct multipart boundary
        },
        body: form,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({}));
        console.error("[uploadFromUrl] Strapi upload API error:", errBody);
        ctx.status = 502;
        return (ctx.body = {
          success: false,
          error:
            (errBody as any)?.error?.message ||
            `Strapi upload failed: ${uploadRes.status}`,
        });
      }

      const uploadedFiles = await uploadRes.json();
      const uploadedFile = uploadedFiles[0];
      console.log("[uploadFromUrl] Success, media id:", uploadedFile?.id);

      ctx.body = {
        success: true,
        id: uploadedFile.id,
        url: uploadedFile.url,
        name: uploadedFile.name,
      };
    } catch (error) {
      console.error("[uploadFromUrl] Error:", error.message);
      ctx.status = 500;
      ctx.body = { success: false, error: error.message };
    }
  },
};
