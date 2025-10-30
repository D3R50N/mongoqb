/**
 *
 * @param {string | import("mongoose").Model<any, any, any, any, any, any>} modelOrName
 * @returns A new instance of QueryBuilder
 */
export function query(modelOrName: string | import("mongoose").Model<any, any, any, any, any, any>): QueryBuilder;
import QueryBuilder = require("./core/query-builder");
export { QueryBuilder };
