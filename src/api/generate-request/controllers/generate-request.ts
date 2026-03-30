"use strict";

import { getAuthUser } from "../../../utils/getAuthUser";

module.exports = {
  /**
   * GET /api/generate-request/my-statuses
   * Returns all generate-requests for the current user, keyed by voucherDocumentId.
   * Shape: { data: Array<{ ...request, voucherDocumentId: string }> }
   */
  async getMyStatuses(ctx) {
    const user = await getAuthUser(ctx);
    if (!user) return ctx.unauthorized("Not logged in");

    const requests = await strapi.db
      .query("api::generate-request.generate-request")
      .findMany({
        where: { user: { id: user.id } },
        orderBy: { requestedAt: "desc" },
        populate: ["user", "voucher"],
      });

    const data = requests.map((r: any) => ({
      id: r.id,
      documentId: r.documentId,
      status: r.status,
      requestedAt: r.requestedAt,
      reviewedAt: r.reviewedAt,
      reviewedBy: r.reviewedBy,
      voucherDocumentId: r.voucher?.documentId ?? null,
      voucher: r.voucher
        ? { id: r.voucher.id, documentId: r.voucher.documentId, voucherName: r.voucher.voucherName }
        : null,
      user: r.user
        ? { id: r.user.id, username: r.user.username, email: r.user.email }
        : null,
    }));

    return ctx.send({ data });
  },

  /**
   * POST /api/generate-request/submit
   * Body: { voucherDocumentId: string }
   *
   * Creates a pending request scoped to a specific voucher.
   * - If an active (pending/approved) request already exists for this user+voucher, returns it.
   * - If the last request for this voucher was denied, creates a new one.
   */
  async submitRequest(ctx) {
    const user = await getAuthUser(ctx);
    if (!user) return ctx.unauthorized("Not logged in");

    const { voucherDocumentId } = ctx.request.body as { voucherDocumentId?: string };
    if (!voucherDocumentId) {
      return ctx.badRequest("voucherDocumentId is required");
    }

    // Resolve voucher by documentId
    const voucher = await strapi.db
      .query("api::voucher.voucher")
      .findOne({ where: { documentId: voucherDocumentId } });

    if (!voucher) {
      return ctx.notFound("Voucher not found");
    }

    // Check for an existing non-denied request for this user + voucher
    const existing = await strapi.db
      .query("api::generate-request.generate-request")
      .findOne({
        where: {
          user: { id: user.id },
          voucher: { id: voucher.id },
          status: { $ne: "denied" },
        },
        orderBy: { requestedAt: "desc" },
        populate: ["voucher"],
      });

    if (existing) {
      return ctx.send({
        data: {
          ...existing,
          voucherDocumentId: voucherDocumentId,
          voucher: { id: voucher.id, documentId: voucher.documentId, voucherName: voucher.voucherName },
        },
      });
    }

    // Create a new pending request
    const newRequest = await strapi.db
      .query("api::generate-request.generate-request")
      .create({
        data: {
          user: user.id,
          voucher: voucher.id,
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
        populate: ["voucher"],
      });

    return ctx.send({
      data: {
        ...newRequest,
        voucherDocumentId: voucherDocumentId,
        voucher: { id: voucher.id, documentId: voucher.documentId, voucherName: voucher.voucherName },
      },
    });
  },
};
