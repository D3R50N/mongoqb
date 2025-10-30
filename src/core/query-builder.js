//@ts-nocheck
const mongoose = require('mongoose');
module.exports= class QueryBuilder {
  /** @type {number?} */
  #limit = null;

  /** @type {number?} */
  #skip = null;

  #select = [];
  #conditions = [];
  #aggregations = [];
  #currentGroup;

  /**
   * @type {Object.<string,1|-1>}
   */
  #sort = {};

  /**
   * Model attached to the builder
   * @type {mongoose.Model}*/
  model;

  /**
   *  Collection attached to the buider
   *  @type {mongoose.Collection}
   *   */
  collection;

  /**
   *
   * @param {String|mongoose.Model} modelOrName
   */
  constructor(modelOrName) {
    if (typeof modelOrName === "string") {
      this.collection = mongoose.connection.collection(modelOrName);
      this.model = Object.values(mongoose.models).find(
        (m) => m.collection.name === this.collection.name
      );
    } else {
      this.model = modelOrName;
      this.collection = this.model.collection;
    }
  }

  #addCondition(block) {
    this.#conditions.push(block);
  }

  #buildQuery() {
    if (!this.#conditions.length) return {};
    if (this.#conditions.length === 1) return this.#conditions[0];
    const combined = { $and: this.#conditions };
    return this.#simplify(combined);
  }

  #simplify(block) {
    if (!block) return block;

    if (Array.isArray(block)) {
      if (block.length === 0) return {};
      if (block.length === 1) return this.#simplify(block[0]);
      return { $or: block.map((b) => this.#simplify(b)) };
    }

    const newBlock = { ...block };

    if (newBlock.$and) {
      const simplified = newBlock.$and.map((b) => this.#simplify(b));
      if (simplified.length === 1) return simplified[0];
      newBlock.$and = simplified;
    }

    if (newBlock.$or) {
      const simplified = newBlock.$or.map((b) => this.#simplify(b));
      if (simplified.length === 1) return simplified[0];
      newBlock.$or = simplified;
    }

    return newBlock;
  }

  #checkColl() {
    if (!this.collection)
      throw new Error(`Cannot query's collection is empty.`);
  }
  #getCollection() {
    this.#checkColl();
    return this.collection;
  }

  /** @type {Object.<string,*>} - Built query */
  get query() {
    return this.#buildQuery();
  }

  /** @type {[Object.<string,*>]} - Built pipeline */
  get pipeline() {
    const pipeline = [];

    if (Object.keys(this.query).length) {
      pipeline.push({ $match: this.query });
    }

    if (Object.keys(this.#sort).length) {
      pipeline.push({ $sort: this.#sort });
    }

    if (this.#skip) pipeline.push({ $skip: this.#skip });
    if (this.#limit) pipeline.push({ $limit: this.#limit });

    if (this.#select.length) {
      const project = this.#select.reduce((acc, f) => {
        acc[f] = 1;
        return acc;
      }, {});
      pipeline.push({ $project: project });
    }

    const has = (o, key) => Object.hasOwn(o, key);

    pipeline.push(
      ...this.#aggregations.filter((a) => {
        const isGroup = has(a, "$group");
        const noKey = isGroup && Object.keys(a["$group"]).length == 0;
        const oneKey = isGroup && Object.keys(a["$group"]).length == 1;
        const hasOnlyId = oneKey && has(a["$group"], "_id");
        return !noKey && !hasOnlyId;
      })
    );

    // @ts-ignore
    return pipeline;
  }

  /**  Name of the collection attached to the buider
   * @type {String|"unknown"}
   */
  get collectionName() {
    return (
      this.collection?.collectionName ||
      this.model?.collection?.collectionName ||
      "unknown"
    );
  }

  /** Built pipeline as json string */
  toString() {
    return JSON.stringify(
      this.pipeline,
      (key, value) => {
        if (value instanceof RegExp) return `/${value.source}/${value.flags}`;
        return value;
      },
      2
    );
  }

  /** Built query as json string */
  queryToString() {
    return JSON.stringify(
      this.query,
      (key, value) => {
        if (value instanceof RegExp) return `/${value.source}/${value.flags}`;
        return value;
      },
      2
    );
  }

  /** Converts the builder to a readable json  */
  toJson() {
    return {
      query: this.query,
      sort: this.#sort,
      skip: this.#skip,
      limit: this.#limit,
      select: this.#select.length ? this.#select : null,
      aggregations: this.#aggregations.length ? this.#aggregations : null,
    };
  }

  /** Converts the builder to a readable SQL request  */
  toSQL() {
    const parts = [];

    const fields = this.#select.length ? this.#select.join(", ") : "*";
    parts.push(`SELECT ${fields}`);

    const table = this.collectionName;
    parts.push(`FROM ${table}`);

    const where = this.query;
    if (Object.keys(where).length) {
      const parseValue = (v) => {
        if (v instanceof RegExp) return `'${v.source}'`;
        if (typeof v === "string") return `'${v}'`;
        if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
        if (v === null) return "NULL";
        return v;
      };

      const parseCondition = (cond) => {
        if (cond.$and) {
          return (
            "(" +
            cond.$and.map(parseCondition).filter(Boolean).join(" AND ") +
            ")"
          );
        }
        if (cond.$or) {
          return (
            "(" +
            cond.$or.map(parseCondition).filter(Boolean).join(" OR ") +
            ")"
          );
        }

        return Object.entries(cond)
          .map(([k, v]) => {
            if (typeof v === "object" && v !== null && !(v instanceof RegExp)) {
              if ("$ne" in v) return `${k} != ${parseValue(v.$ne)}`;
              if ("$in" in v)
                return `${k} IN (${v.$in.map(parseValue).join(", ")})`;
              if ("$nin" in v)
                return `${k} NOT IN (${v.$nin.map(parseValue).join(", ")})`;
              if ("$gt" in v) return `${k} > ${parseValue(v.$gt)}`;
              if ("$gte" in v) return `${k} >= ${parseValue(v.$gte)}`;
              if ("$lt" in v) return `${k} < ${parseValue(v.$lt)}`;
              if ("$lte" in v) return `${k} <= ${parseValue(v.$lte)}`;
              if ("$regex" in v) return `${k} LIKE ${parseValue(v.$regex)}`;
              if ("$not" in v && v.$not instanceof RegExp)
                return `${k} NOT LIKE ${parseValue(v.$not)}`;
            }
            if (v instanceof RegExp) return `${k} LIKE ${parseValue(v)}`;
            return `${k} = ${parseValue(v)}`;
          })
          .filter(Boolean)
          .join(" AND ");
      };

      parts.push(`WHERE ${parseCondition(where)}`);
    }

    if (Object.keys(this.#sort).length) {
      const order = Object.entries(this.#sort)
        .map(([k, v]) => `${k} ${v === -1 ? "DESC" : "ASC"}`)
        .join(", ");
      parts.push(`ORDER BY ${order}`);
    }

    if (this.#limit) parts.push(`LIMIT ${this.#limit}`);
    if (this.#skip) parts.push(`OFFSET ${this.#skip}`);

    return parts.join(" ");
  }

  /** Log the pipeline */
  debug() {
    console.log(this.toString());
    return this;
  }

  /** Converts the builder to a friendly readable text  */
  explain(log = true) {
    /** @type {Object.<string,(s:string|number)=>string>} */
    const color = {
      blue: (s) => `\x1b[34m${s}\x1b[0m`,
      cyan: (s) => `\x1b[36m${s}\x1b[0m`,
      green: (s) => `\x1b[32m${s}\x1b[0m`,
      yellow: (s) => `\x1b[33m${s}\x1b[0m`,
      magenta: (s) => `\x1b[35m${s}\x1b[0m`,
      gray: (s) => `\x1b[90m${s}\x1b[0m`,
      bold: (s) => `\x1b[1m${s}\x1b[0m`,
    };

    const lines = [];

    const table = this.collectionName;

    lines.push(
      `${color.bold(color.cyan("Collection:"))} ${color.yellow(table)}`
    );

    const query = this.query;
    if (Object.keys(query).length) {
      lines.push(`${color.bold(color.cyan("Filters:"))}`);

      const formatCondition = (cond, indent = 2) => {
        const pad = " ".repeat(indent);

        if (cond.$and)
          return cond.$and
            .map((c) => formatCondition(c, indent))
            .join(`\n${pad}${color.gray("and")}`);

        if (cond.$or)
          return cond.$or
            .map((c) => formatCondition(c, indent))
            .join(`\n${pad}${color.gray("or ")}`);

        return Object.entries(cond)
          .map(([k, v]) => {
            if (v instanceof RegExp)
              return `${pad}${color.yellow(k)} ${color.gray(
                "matches"
              )} ${color.green(`/${v.source}/`)}`;

            if (typeof v === "object" && v !== null && !Array.isArray(v)) {
              const parts = [];

              if ("$ne" in v)
                parts.push(
                  `${color.gray("!=")} ${color.green(JSON.stringify(v.$ne))}`
                );

              if ("$not" in v)
                return `${pad}${color.yellow(k)} ${color.gray(
                  "not matches"
                )} ${color.green(`/${v.$not.source || v.$not}/`)}`;

              if ("$in" in v)
                parts.push(
                  `${color.gray("in")} [${color.green(v.$in.join(", "))}]`
                );
              if ("$nin" in v)
                parts.push(
                  `${color.gray("not in")} [${color.green(v.$nin.join(", "))}]`
                );
              if ("$gt" in v)
                parts.push(`${color.gray(">")} ${color.green(v.$gt)}`);
              if ("$gte" in v)
                parts.push(`${color.gray(">=")} ${color.green(v.$gte)}`);
              if ("$lt" in v)
                parts.push(`${color.gray("<")} ${color.green(v.$lt)}`);
              if ("$lte" in v)
                parts.push(`${color.gray("<=")} ${color.green(v.$lte)}`);
              if ("$exists" in v)
                parts.push(
                  `${color.gray(v.$exists ? "exists" : "not exists")}`
                );
              if ("$regex" in v)
                parts.push(
                  `${color.gray("matches")} ${color.green(`/${v.$regex}/`)}`
                );

              if (parts.length)
                return `${pad}${color.yellow(k)} ${parts.join(
                  ` ${color.gray("and")} `
                )}`;
            }

            return `${pad}${color.yellow(k)} ${color.gray("=")} ${color.green(
              JSON.stringify(v)
            )}`;
          })
          .join("\n");
      };

      lines.push(formatCondition(query, 2));
    }

    if (this.#select.length) {
      lines.push(
        `${color.bold(color.cyan("Fields:"))} ${this.#select
          .map(color.green)
          .join(", ")}`
      );
    }

    if (Object.keys(this.#sort).length) {
      const order = Object.entries(this.#sort)
        .map(
          ([k, v]) =>
            `${color.yellow(k)} ${color.gray(v === -1 ? "DESC" : "ASC")}`
        )
        .join(", ");
      lines.push(`${color.bold(color.cyan("Sort:"))} ${order}`);
    }

    if (this.#skip || this.#limit) {
      lines.push(`${color.bold(color.cyan("Pagination:"))}`);
      if (this.#skip)
        lines.push(`  ${color.gray("Skip:")} ${color.green(this.#skip)}`);
      if (this.#limit)
        lines.push(`  ${color.gray("Limit:")} ${color.green(this.#limit)}`);
    }

    if (this.#aggregations?.length) {
      lines.push(`${color.bold(color.cyan("Aggregations:"))}`);
      this.#aggregations.forEach((stage, i) => {
        lines.push(
          `  ${color.gray(`[Stage ${i}]`)} ${color.green(
            JSON.stringify(stage, null, 2)
          )}`
        );
      });
    }
    if (log) console.log(lines.join("\n"), "\n");
    return lines.join("\n");
  }

  /**
   * @param  {...Object.<string,*>} objects - Conditions as objects
   * @example
   * const q = query("users").where({name:"xxx"},{"age":10}) // name=xxx OR age=10
   * const q2 = query("admins").where({name:"xxx","role":"super"}) // name=xxx AND role=10
   */
  where(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({ [k]: v })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,*>} objects
   * @example
   * const q = query("users").whereNot({name:"xxx"})
   */
  whereNot(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({ [k]: { $ne: v } })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,[*]>} objects
   * @example
   * const q = query("users").whereIn({name:["x1","x2"]})
   */
  whereIn(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({
        [k]: { $in: Array.isArray(v) ? v : [v] },
      })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,[*]>} objects
   * @example
   * const q = query("users").whereNotIn({age:[12,18]})
   */
  whereNotIn(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({
        [k]: { $nin: Array.isArray(v) ? v : [v] },
      })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,Number>} objects
   * @example
   * const q = query("users").whereGreater({age:9})
   */
  whereGreater(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({ [k]: { $gt: v } })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,Number>} objects
   */
  whereLess(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({ [k]: { $lt: v } })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,Number>} objects
   */
  whereGreaterEq(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({ [k]: { $gte: v } })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,Number>} objects
   */
  whereLessEq(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({ [k]: { $lte: v } })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,[Number,Number]>} objects
   * @example
   * const q = query("users").whereBetween({age:[0,10]})
   */
  whereBetween(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, [min, max]]) => ({
        [k]: { $gte: min, $lte: max },
      })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }
  /**
   * @param {...Object.<string,[Number,Number]>} objects
   */
  whereNotBetween(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, [min, max]]) => ({
        $or: [{ [k]: { $lt: min } }, { [k]: { $gt: max } }],
      })),
    }));

    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,string|RegExp>} objects
   * @example
   * const q = query("users").whereLike({name:"xxx"}) // matches /xxx/i
   */
  whereLike(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({
        [k]: v instanceof RegExp ? v : new RegExp(v, "i"),
      })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,string|RegExp>} objects
   */
  whereNotLike(...objects) {
    const orBlocks = objects.map((obj) => ({
      $and: Object.entries(obj).map(([k, v]) => ({
        [k]: { $not: v instanceof RegExp ? v : new RegExp(v, "i") },
      })),
    }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...string} fields
   * @example
   * const q = query("users").whereExists("name","email")
   */
  whereExists(...fields) {
    const orBlocks = fields.map((f) => ({ [f]: { $exists: true } }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param  {...string} fields
   */
  whereNotExists(...fields) {
    const orBlocks = fields.map((f) => ({ [f]: { $exists: false } }));
    const finalBlock = this.#simplify(orBlocks);
    this.#addCondition(finalBlock);
    return this;
  }

  /**
   * @param {...Object.<string,string|RegExp>} objects
   * @alias whereLike
   */
  whereMatch(...objects) {
    return this.whereLike(...objects);
  }

  /**
   * Add a raw condition
   * @param {Object.<string,*>} condition
   * @example
   * const q = query("users").where({$and:[{name:"xxx"},{age:10}]})
   */
  whereRaw(condition) {
    return this.#addCondition(condition), this;
  }

  /**
   * @param {String} field - Name of the field
   * @param {"desc"|"asc"|"d"|"a"} direction - Sort order
   * @alias orderBy
   */
  sort(field, direction = "asc") {
    return this.orderBy(field, direction);
  }

  /**
   * @example
   * const q = query("users").orderBy("name","desc")
   * @param {String} field - Name of the field
   * @param {"desc"|"asc"|"d"|"a"} direction - Sort order
   * @alias sort
   */
  orderBy(field, direction = "asc") {
    if (!field) return this;
    this.#sort[field] =
      direction.toLocaleLowerCase() === "desc" ||
      direction.toLocaleLowerCase() === "d"
        ? -1
        : 1;
    return this;
  }

  /**
   * Limit query results
   * @param {Number} n
   */
  limit(n) {
    this.#limit = n;
    return this;
  }

  /**
   * Skip query results
   * @param {Number} n
   */
  skip(n) {
    this.#skip = n;
    return this;
  }

  /**
   * Combine limit and skip to paginate results
   * @param {number} [page=1]
   * @param {number} [perPage=10]
   */
  paginate(page = 1, perPage = 10) {
    const p = Math.max(1, page);
    const pp = Math.max(1, perPage);

    this.skip((p - 1) * pp).limit(pp);
    return this;
  }

  /**
   * Select fields on results
   * @param {...String} fields
   */
  select(...fields) {
    this.#select.push(...fields);
    this.#select = Array.from(new Set(this.#select));
    return this;
  }

  /**
   * Merge builders with OR clause
   * @param {...QueryBuilder} builders
   */
  or(...builders) {
    const orConditions = builders
      .filter((b) => b instanceof QueryBuilder)
      .map((b) => b.#buildQuery())
      .filter((q) => Object.keys(q).length > 0);

    if (!orConditions.length) return this;

    const current = this.#buildQuery();
    if (Object.keys(current).length) orConditions.unshift(current);

    this.#conditions = [{ $or: orConditions }];
    return this;
  }

  /**
   * Merge builders with AND clause
   * @param {...QueryBuilder} builders
   */
  and(...builders) {
    const andConditions = builders
      .filter((b) => b instanceof QueryBuilder)
      .map((b) => b.#buildQuery())
      .filter((q) => Object.keys(q).length > 0);

    if (!andConditions.length) return this;

    const current = this.#buildQuery();
    if (Object.keys(current).length) andConditions.unshift(current);

    this.#conditions = [{ $and: andConditions }];
    return this;
  }

  /**
   * Clone the current builder. If `queryOnly` is true, it will ignore all aggregations
   * @param {boolean} [queryOnly=false]
   */
  clone(queryOnly = false) {
    const copy = new QueryBuilder(this.collectionName);

    copy.#conditions = JSON.parse(JSON.stringify(this.#conditions));
    if (!queryOnly)
      copy.#aggregations = JSON.parse(JSON.stringify(this.#aggregations));
    copy.#sort = { ...this.#sort };
    copy.#limit = this.#limit;
    copy.#skip = this.#skip;
    copy.#select = [...this.#select];

    return copy;
  }

  /** Group aggregations on a stage
   * @param {string?} [stageName=null]
   */
  group(stageName = null) {
    if (!this.#aggregations) this.#aggregations = [];
    const groupStage = { $group: { _id: stageName } };
    this.#aggregations.push(groupStage);
    this.#currentGroup = groupStage;
    return this;
  }

  /**
   * @param {String} str
   */
  #capitalize(str, firstOnly = false) {
    let substr = str.substring(1);
    if (firstOnly) substr = substr.toLocaleLowerCase();
    return str[0].toLocaleUpperCase() + substr;
  }

  /**
   * @param {String} field - Field to sum
   * @param {String} alias - Name of the output (default sumField)
   */
  sum(field, alias = "sum") {
    alias += this.#capitalize(field);
    if (!this.#currentGroup) this.group();
    this.#currentGroup.$group[alias] = { $sum: `$${field}` };
    return this;
  }

  /**
   * @param {String} field - Field to avg
   * @param {String} alias - Name of the output (default avgField)
   */
  avg(field, alias = "avg") {
    alias += this.#capitalize(field);
    if (!this.#currentGroup) this.group();
    this.#currentGroup.$group[alias] = { $avg: `$${field}` };
    return this;
  }

  /**
   * @param {String} field - Target field
   * @param {String} alias - Name of the output (default maxField)
   */ max(field, alias = "max") {
    alias += this.#capitalize(field);
    if (!this.#currentGroup) this.group();
    this.#currentGroup.$group[alias] = { $max: `$${field}` };
    return this;
  }

  /**
   * @param {String} field - Target field
   * @param {String} alias - Name of the output (default minField)
   */ min(field, alias = "min") {
    alias += this.#capitalize(field);
    if (!this.#currentGroup) this.group();
    this.#currentGroup.$group[alias] = { $min: `$${field}` };
    return this;
  }

  /** @returns Count docs in collection */
  async count() {
    const coll = this.#getCollection();
    const query = this.query;
    return Object.keys(query).length
      ? await coll.countDocuments(query)
      : await coll.estimatedDocumentCount();
  }

  /** @alias get */
  async find() {
    return this.get();
  }

  /**
   * Get all matching docs
   * @returns {Promise<[mongoose.Document]>}
   */
  async get() {
    const coll = this.#getCollection();
    const cursor = coll.aggregate(this.pipeline);

    const array = await cursor.toArray();
    if (this.model) {
      const docs = array.map((d) => this.model.hydrate(d));
      // @ts-ignore
      return docs;
    }
    // @ts-ignore
    return array;
  }

  /** Delete all docs matching the query
   * @param {boolean} [safe=true] - It prevents from accidentally delete all docs (when query is empty)
   */
  async delete(safe = true) {
    if (safe && (!this.query || !Object.keys(this.query).length)) {
      throw new Error("Unsafe delete cause query is empty");
    }
    const coll = this.#getCollection();

    return await coll.deleteMany(this.query);
  }

  /** Delete first doc matching */
  async deleteOne() {
    const coll = this.#getCollection();

    return await coll.deleteOne(this.query);
  }
  /**
   *
   * @param {string} op
   * @param {Object.<string,*>} data
   * @param {boolean} all
   * @returns
   */
  async #applyUpdate(op, data, all = false) {
    const updateQuery = { [op]: data };
    return this.updateRaw(updateQuery, all);
  }

  /**
   *
   * @param {Object} data - Raw update data
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .where({age:18})
   * .updateRaw({$set:{type:"adult"}})
   */
  async updateRaw(data, all = false) {
    const coll = this.#getCollection();

    if (!Object.keys(data).find((k) => k.startsWith("$")))
      data = { $set: data };

    if (!data || typeof data !== "object" || !Object.keys(data).length) {
      throw new Error("updateRaw expects a non-empty object");
    }

    const filter = this.query;

    const result = all
      ? await coll.updateMany(filter, data)
      : await coll.updateOne(filter, data);

    return result;
  }

  /**
   * Default update ($set) - Replace or add new fields
   * @param {Object} data - Update data
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .where({age:18})
   * .update({type:"adult"})
   */
  async update(data, all = false) {
    return this.#applyUpdate("$set", data, all);
  }
  /**
   * Rename update ($rename) - Rename field
   * @param {String} oldField
   * @param {String} newField
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .updateRename("age","years",true)
   */
  async updateRename(oldField, newField, all = false) {
    if (!oldField || !newField)
      throw new Error("updateRename expects oldField and newField");
    return this.#applyUpdate("$rename", { [oldField]: newField }, all);
  }

  /**
   * Multiply update ($mul) - Multiply field by value
   * @param {Object} data - Update data
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .updateMul({score:2, age:4}) //score = score*2 and age = age*4
   */
  async updateMul(data, all = false) {
    return this.#applyUpdate("$mul", data, all);
  }

  /**
   * Increment update ($inc) - Increment fields by number
   * @param {Object} data - Update data
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .where({age:18})
   * .updateInc({score:1}) // score = score+1
   */
  async updateInc(data, all = false) {
    return this.#applyUpdate("$inc", data, all);
  }

  /**
   * Push update ($push) - Add element to array fields
   * @param {Object} data - Update data
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .where({age:18})
   * .updatePush({bagdes:"major"})
   */
  async updatePush(data, all = false) {
    return this.#applyUpdate("$push", data, all);
  }

  /**
   * Add update ($addToSet) - Add element to array fields without duplicate
   * @param {Object} data - Update data
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .where({age:18})
   * .updateAdd({bagdes:"major"}) //no duplicate
   */
  async updateAdd(data, all = false) {
    return this.#applyUpdate("$addToSet", data, all);
  }

  /**
   * Pull update ($pull) - Remove element from an array field
   * @param {Object} data - Update data
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .whereLess({age:18})
   * .updatePull({bagdes:"major"})
   */
  async updatePull(data, all = false) {
    return this.#applyUpdate("$pull", data, all);
  }

  /**
   * Unset update ($unset) - Remove some fields
   * @param {[String]|Object} fields - Fields to remove
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("users")
   * .whereLike({name:/^admin/i})
   * .updateUnset("restrictions")
   */
  async updateUnset(fields, all = false) {
    const data = Array.isArray(fields)
      ? fields.reduce((acc, f) => ((acc[f] = ""), acc), {})
      : fields;
    return this.#applyUpdate("$unset", data, all);
  }

  /**
   * Remove element at `index` from array `field`
   * @param {String} field - Target field
   * @param {Number} index
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("products")
   * .updateRemoveAt("prices",0,true) // all docs
   */
  async updateRemoveAt(field, index, all = false) {
    const coll = this.#getCollection();

    if (typeof field !== "string" || typeof index !== "number") {
      throw new Error(
        "updateRemoveAt expects a field name and a numeric index"
      );
    }

    if (!all) {
      const doc = await coll.findOne(this.query);
      if (!doc) return { matchedCount: 0, modifiedCount: 0, failedCount: 0 };

      const arr = doc[field];
      if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
        return { matchedCount: 1, modifiedCount: 0, failedCount: 0 };
      }

      arr.splice(index, 1);
      try {
        const res = await coll.updateOne(
          { _id: doc._id },
          { $set: { [field]: arr } }
        );
        return {
          matchedCount: 1,
          modifiedCount: res.modifiedCount > 0 ? 1 : 0,
          failedCount: res.modifiedCount > 0 ? 0 : 1,
        };
      } catch (err) {
        return { matchedCount: 1, modifiedCount: 0, failedCount: 1 };
      }
    }

    const docs = await coll.find(this.query).toArray();
    if (!docs.length)
      return { matchedCount: 0, modifiedCount: 0, failedCount: 0 };

    const results = await Promise.all(
      docs.map(async (doc) => {
        try {
          const arr = doc[field];
          if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
            return { success: false, skipped: true };
          }

          arr.splice(index, 1);
          const res = await coll.updateOne(
            { _id: doc._id },
            { $set: { [field]: arr } }
          );

          return { success: res.modifiedCount > 0, skipped: false };
        } catch (err) {
          return { success: false, skipped: false };
        }
      })
    );

    const modifiedCount = results.filter((r) => r.success).length;
    const skippedCount = results.filter((r) => r.skipped).length;
    const total = docs.length;
    const failedCount = total - modifiedCount - skippedCount;

    return {
      matchedCount: total,
      modifiedCount,
      failedCount,
    };
  }

  /**
   * Remove first or last element of `field` depending on `direction`
   * @param {String} field - Target field
   * @param {1|-1} direction
   * @param {boolean} [all=false] - Should apply on all matching docs
   * @example
   * query("products")
   * .updatePop("prices") // last element
   */
  async updatePop(field, direction = 1, all = false) {
    if (typeof field !== "string" || ![-1, 1].includes(direction))
      throw new Error("updatePop expects field and direction (-1 or 1)");
    return this.#applyUpdate("$pop", { [field]: direction }, all);
  }

  /**
   * Take some values after result
   * @param {Number} n - Number to take
   */
  async take(n) {
    if (isNaN(n))
      throw new Error(`Cannot take cause (${n}) is not a valid number`);

    const results = await this.get();
    if (n < 0) n = results.length + Math.max(-results.length, n) + 1;
    return results.filter((d, i) => i < n);
  }

  /** @returns The first result without limiting to 1 */

  async first() {
    const results = await this.get();
    return results[0] || null;
  }

  /** @returns Limit to 1 and then returns the first result */
  async getOne() {
    this.limit(1);
    return this.first();
  }

  /** @alias getOne */
  async findOne() {
    return this.getOne();
  }
}
