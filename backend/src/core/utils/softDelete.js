'use strict';

/**
 * Mongoose soft-delete plugin.
 *
 * Adds `isDeleted` and `deletedAt` fields to any schema.
 * Overrides `find`, `findOne`, `countDocuments` to exclude deleted docs by default.
 * Adds `softDelete()` instance method and `Model.softDelete(filter)` static.
 *
 * Usage:
 *   schema.plugin(softDeletePlugin);
 *
 * @param {import('mongoose').Schema} schema
 */
function softDeletePlugin(schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  });

  // Pre-hook: exclude deleted docs from find/findOne/count
  const methods = ['find', 'findOne', 'findOneAndUpdate', 'countDocuments', 'count'];
  methods.forEach((method) => {
    schema.pre(method, function () {
      if (!this.getQuery().includeDeleted) {
        this.where({ isDeleted: { $ne: true } });
      }
    });
  });

  // Instance method: soft delete this document
  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  // Static: soft delete by filter
  schema.statics.softDelete = async function (filter) {
    return this.updateMany(filter, { isDeleted: true, deletedAt: new Date() });
  };

  // Static: restore soft-deleted documents
  schema.statics.restore = async function (filter) {
    return this.updateMany(
      { ...filter, isDeleted: true },
      { isDeleted: false, deletedAt: null }
    );
  };
}

module.exports = softDeletePlugin;
