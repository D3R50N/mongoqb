/// <reference types="mongoose/types/aggregate" />
/// <reference types="mongoose/types/callback" />
/// <reference types="mongoose/types/collection" />
/// <reference types="mongoose/types/connection" />
/// <reference types="mongoose/types/cursor" />
/// <reference types="mongoose/types/document" />
/// <reference types="mongoose/types/error" />
/// <reference types="mongoose/types/expressions" />
/// <reference types="mongoose/types/helpers" />
/// <reference types="mongoose/types/middlewares" />
/// <reference types="mongoose/types/indexes" />
/// <reference types="mongoose/types/models" />
/// <reference types="mongoose/types/mongooseoptions" />
/// <reference types="mongoose/types/pipelinestage" />
/// <reference types="mongoose/types/populate" />
/// <reference types="mongoose/types/query" />
/// <reference types="mongoose/types/schemaoptions" />
/// <reference types="mongoose/types/session" />
/// <reference types="mongoose/types/types" />
/// <reference types="mongoose/types/utility" />
/// <reference types="mongoose/types/validation" />
/// <reference types="mongoose/types/virtuals" />
/// <reference types="mongoose/types/schematypes" />
/// <reference types="mongoose/types/inferschematype" />
/// <reference types="mongoose/types/inferrawdoctype" />
export = QueryBuilder;
declare class QueryBuilder {
    /**
     *
     * @param {String|mongoose.Model} modelOrName
     */
    constructor(modelOrName: string | mongoose.Model<any, any, any, any, any, any>);
    /**
     * Model attached to the builder
     * @type {mongoose.Model}*/
    model: mongoose.Model<any, any, any, any, any, any>;
    /**
     *  Collection attached to the buider
     *  @type {mongoose.Collection}
     *   */
    collection: mongoose.Collection;
    /** @type {Object.<string,*>} - Built query */
    get query(): {
        [x: string]: any;
    };
    /** @type {[Object.<string,*>]} - Built pipeline */
    get pipeline(): [{
        [x: string]: any;
    }];
    /**  Name of the collection attached to the buider
     * @type {String|"unknown"}
     */
    get collectionName(): string;
    /** Schema of the current model */
    get schema(): {} | null;
    /** Built pipeline as json string */
    toString(): string;
    /** Built query as json string */
    queryToString(): string;
    /** Converts the builder to a readable json  */
    toJson(): {
        query: {
            [x: string]: any;
        };
        collection: string;
        model: string;
        schema: {} | null;
        sort: {
            [x: string]: 1 | -1;
        };
        skip: number | null;
        limit: number | null;
        select: any[] | null;
        aggregations: any[] | null;
    };
    /** Converts the builder to a readable SQL request  */
    toSQL(): string;
    /** Log the pipeline */
    debug(): this;
    /** Converts the builder to a friendly readable text  */
    explain(log?: boolean): string;
    /**
     * @param  {...Object.<string,*>} objects - Conditions as objects
     * @example
     * const q = query("users").where({name:"xxx"},{"age":10}) // name=xxx OR age=10
     * const q2 = query("admins").where({name:"xxx","role":"super"}) // name=xxx AND role=10
     */
    where(...objects: {
        [x: string]: any;
    }[]): this;
    /**
     * @param {...Object.<string,*>} objects
     * @example
     * const q = query("users").whereNot({name:"xxx"})
     */
    whereNot(...objects: {
        [x: string]: any;
    }[]): this;
    /**
     * @param {...Object.<string,[*]>} objects
     * @example
     * const q = query("users").whereIn({name:["x1","x2"]})
     */
    whereIn(...objects: {
        [x: string]: [any];
    }[]): this;
    /**
     * @param {...Object.<string,[*]>} objects
     * @example
     * const q = query("users").whereNotIn({age:[12,18]})
     */
    whereNotIn(...objects: {
        [x: string]: [any];
    }[]): this;
    /**
     * @param {...Object.<string,Number>} objects
     * @example
     * const q = query("users").whereGreater({age:9})
     */
    whereGreater(...objects: {
        [x: string]: number;
    }[]): this;
    /**
     * @param {...Object.<string,Number>} objects
     */
    whereLess(...objects: {
        [x: string]: number;
    }[]): this;
    /**
     * @param {...Object.<string,Number>} objects
     */
    whereGreaterEq(...objects: {
        [x: string]: number;
    }[]): this;
    /**
     * @param {...Object.<string,Number>} objects
     */
    whereLessEq(...objects: {
        [x: string]: number;
    }[]): this;
    /**
     * @param {...Object.<string,[Number,Number]>} objects
     * @example
     * const q = query("users").whereBetween({age:[0,10]})
     */
    whereBetween(...objects: {
        [x: string]: [number, number];
    }[]): this;
    /**
     * @param {...Object.<string,[Number,Number]>} objects
     */
    whereNotBetween(...objects: {
        [x: string]: [number, number];
    }[]): this;
    /**
     * @param {...Object.<string,string|RegExp>} objects
     * @example
     * const q = query("users").whereLike({name:"xxx"}) // matches /xxx/i
     */
    whereLike(...objects: {
        [x: string]: string | RegExp;
    }[]): this;
    /**
     * @param {...Object.<string,string|RegExp>} objects
     */
    whereNotLike(...objects: {
        [x: string]: string | RegExp;
    }[]): this;
    /**
     * @param {...string} fields
     * @example
     * const q = query("users").whereExists("name","email")
     */
    whereExists(...fields: string[]): this;
    /**
     * @param  {...string} fields
     */
    whereNotExists(...fields: string[]): this;
    /**
     * @param {...Object.<string,string|RegExp>} objects
     * @alias whereLike
     */
    whereMatch(...objects: {
        [x: string]: string | RegExp;
    }[]): this;
    /**
     * Add a raw condition
     * @param {Object.<string,*>} condition
     * @example
     * const q = query("users").where({$and:[{name:"xxx"},{age:10}]})
     */
    whereRaw(condition: {
        [x: string]: any;
    }): this;
    /**
     * @param {String} field - Name of the field
     * @param {"desc"|"asc"|"d"|"a"} direction - Sort order
     * @alias orderBy
     */
    sort(field: string, direction?: "desc" | "asc" | "d" | "a"): this;
    /**
     * @example
     * const q = query("users").orderBy("name","desc")
     * @param {String} field - Name of the field
     * @param {"desc"|"asc"|"d"|"a"} direction - Sort order
     * @alias sort
     */
    orderBy(field: string, direction?: "desc" | "asc" | "d" | "a"): this;
    /**
     * Limit query results
     * @param {Number} n
     */
    limit(n: number): this;
    /**
     * Skip query results
     * @param {Number} n
     */
    skip(n: number): this;
    /**
     * Combine limit and skip to paginate results
     * @param {number} [page=1]
     * @param {number} [perPage=10]
     */
    paginate(page?: number | undefined, perPage?: number | undefined): this;
    /**
     * Select fields on results
     * @param {...String} fields
     */
    select(...fields: string[]): this;
    /**
     * Merge builders with OR clause
     * @param {...QueryBuilder} builders
     */
    or(...builders: QueryBuilder[]): this;
    /**
     * Merge builders with AND clause
     * @param {...QueryBuilder} builders
     */
    and(...builders: QueryBuilder[]): this;
    /**
     * Clone the current builder. If `queryOnly` is true, it will ignore all aggregations
     * @param {boolean} [queryOnly=false]
     */
    clone(queryOnly?: boolean | undefined): import("./query-builder");
    /** Group aggregations on a stage
     * @param {string?} [stageName=null]
     */
    group(stageName?: string | null | undefined): this;
    /**
     * @param {String} field - Field to sum
     * @param {String} alias - Name of the output (default sumField)
     */
    sum(field: string, alias?: string): this;
    /**
     * @param {String} field - Field to avg
     * @param {String} alias - Name of the output (default avgField)
     */
    avg(field: string, alias?: string): this;
    /**
     * @param {String} field - Target field
     * @param {String} alias - Name of the output (default maxField)
     */ max(field: string, alias?: string): this;
    /**
     * @param {String} field - Target field
     * @param {String} alias - Name of the output (default minField)
     */ min(field: string, alias?: string): this;
    /** @returns Count docs in collection */
    count(): Promise<number>;
    /** @alias get */
    find(): Promise<[mongoose.Document<any, any, any, Record<string, any>, any>]>;
    /**
     * Get all matching docs
     * @returns {Promise<[mongoose.Document]>}
     */
    get(): Promise<[mongoose.Document]>;
    /** Delete all docs matching the query
     * @param {boolean} [safe=true] - It prevents from accidentally delete all docs (when query is empty)
     */
    delete(safe?: boolean | undefined): Promise<mongoose.mongo.DeleteResult>;
    /** Delete first doc matching */
    deleteOne(): Promise<mongoose.mongo.DeleteResult>;
    /**
     *
     * @param {Object} data - Raw update data
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .where({age:18})
     * .updateRaw({$set:{type:"adult"}})
     */
    updateRaw(data: Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Default update ($set) - Replace or add new fields
     * @param {Object} data - Update data
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .where({age:18})
     * .update({type:"adult"})
     */
    update(data: Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Rename update ($rename) - Rename field
     * @param {String} oldField
     * @param {String} newField
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .updateRename("age","years",true)
     */
    updateRename(oldField: string, newField: string, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Multiply update ($mul) - Multiply field by value
     * @param {Object} data - Update data
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .updateMul({score:2, age:4}) //score = score*2 and age = age*4
     */
    updateMul(data: Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Increment update ($inc) - Increment fields by number
     * @param {Object} data - Update data
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .where({age:18})
     * .updateInc({score:1}) // score = score+1
     */
    updateInc(data: Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Push update ($push) - Add element to array fields
     * @param {Object} data - Update data
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .where({age:18})
     * .updatePush({bagdes:"major"})
     */
    updatePush(data: Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Add update ($addToSet) - Add element to array fields without duplicate
     * @param {Object} data - Update data
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .where({age:18})
     * .updateAdd({bagdes:"major"}) //no duplicate
     */
    updateAdd(data: Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Pull update ($pull) - Remove element from an array field
     * @param {Object} data - Update data
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .whereLess({age:18})
     * .updatePull({bagdes:"major"})
     */
    updatePull(data: Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Unset update ($unset) - Remove some fields
     * @param {[String]|Object} fields - Fields to remove
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("users")
     * .whereLike({name:/^admin/i})
     * .updateUnset("restrictions")
     */
    updateUnset(fields: [string] | Object, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Remove element at `index` from array `field`
     * @param {String} field - Target field
     * @param {Number} index
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("products")
     * .updateRemoveAt("prices",0,true) // all docs
     */
    updateRemoveAt(field: string, index: number, all?: boolean | undefined): Promise<{
        matchedCount: number;
        modifiedCount: number;
        failedCount: number;
    }>;
    /**
     * Remove first or last element of `field` depending on `direction`
     * @param {String} field - Target field
     * @param {1|-1} direction
     * @param {boolean} [all=false] - Should apply on all matching docs
     * @example
     * query("products")
     * .updatePop("prices") // last element
     */
    updatePop(field: string, direction?: 1 | -1, all?: boolean | undefined): Promise<mongoose.mongo.UpdateResult<mongoose.mongo.BSON.Document>>;
    /**
     * Take some values after result
     * @param {Number} n - Number to take
     */
    take(n: number): Promise<mongoose.Document<any, any, any, Record<string, any>, any>[]>;
    /** @returns The first result without limiting to 1 */
    first(): Promise<mongoose.Document<any, any, any, Record<string, any>, any>>;
    /** @returns Limit to 1 and then returns the first result */
    getOne(): Promise<mongoose.Document<any, any, any, Record<string, any>, any>>;
    /** @alias getOne */
    findOne(): Promise<mongoose.Document<any, any, any, Record<string, any>, any>>;
    #private;
}
import mongoose = require("mongoose");
