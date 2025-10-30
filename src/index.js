const QueryBuilder = require('./core/query-builder');
/**
 * 
 * @param {string | import("mongoose").Model<any, any, any, any, any, any>} modelOrName 
 * @returns A new instance of QueryBuilder
 */
 const query = (modelOrName) => new QueryBuilder(modelOrName);

module.exports = {
    query, 
    QueryBuilder
}