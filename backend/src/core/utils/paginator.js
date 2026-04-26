'use strict';

const { PAGINATION } = require('./constants');

/**
 * Cursor-based paginator for Mongoose queries.
 *
 * Cursor encodes the last document's _id as a base64 string.
 * This avoids skip() and maintains consistent performance at scale.
 *
 * @param {import('mongoose').Model} Model
 * @param {object} query - Mongoose filter
 * @param {object} options
 * @param {string} [options.cursor] - encoded cursor from previous page
 * @param {number} [options.limit]
 * @param {object} [options.sort] - e.g. { createdAt: -1 }
 * @param {object} [options.select]
 * @param {Function} [options.populate]
 * @returns {Promise<{ data: Array, pagination: { hasNext: boolean, cursor: string|null } }>}
 */
async function paginate(Model, query, options = {}) {
  const limit = Math.min(options.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const sort = options.sort || { createdAt: -1 };
  const select = options.select;

  let filter = { ...query };

  // Apply cursor: filter to docs older/newer than the cursor doc
  if (options.cursor) {
    const lastId = Buffer.from(options.cursor, 'base64').toString('utf8');
    // For descending _id sort, fetch docs with _id less than cursor
    filter._id = { $lt: lastId };
  }

  let q = Model.find(filter).sort(sort).limit(limit + 1);
  if (select) q = q.select(select);
  if (options.populate) q = options.populate(q);

  const docs = await q.lean();

  const hasNext = docs.length > limit;
  if (hasNext) docs.pop();

  const cursor = hasNext
    ? Buffer.from(String(docs[docs.length - 1]._id)).toString('base64')
    : null;

  return { data: docs, pagination: { hasNext, cursor } };
}

module.exports = paginate;
