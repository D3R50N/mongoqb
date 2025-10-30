import QueryBuilder from "./core/query-builder.js";

export const query = (/** @type {string | import("mongoose").Model<any, any, any, any, any, any>} */ modelOrName) => new QueryBuilder(modelOrName);

export { QueryBuilder };
