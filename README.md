# mongqb

An elegant and intuitive query builder for MongoDB with Mongoose, just like modern ORMs.

![Banner](logo.svg)

## Installation

```bash
npm install mongqb
```

## Basic Usage

```javascript
import { query } from "mongqb";
// or
import { QueryBuilder } from "mongqb";

// With model name
const users = query("users").where({ age: 18 }).get();

// With Mongoose model
const User = mongoose.model("User");
const adults = query(User).whereGreater({ age: 18 }).get();
```

## Filtering Methods

### `where(...objects)`

Filter with conditions (AND within one object, OR across multiple objects)

```javascript
// AND: name="john" AND age=25
query("users").where({ name: "john", age: 25 });

// OR: name="john" OR age=25
query("users").where({ name: "john" }, { age: 25 });
```

### `whereNot(...objects)`

Filter with negation

```javascript
query("users").whereNot({ status: "banned" });
```

### `whereIn(objects)` / `whereNotIn(objects)`

Filter with values in/not in an array

```javascript
query("users").whereIn({ role: ["admin", "moderator"] });
query("users").whereNotIn({ age: [12, 15, 17] });
```

### Numeric Comparisons

```javascript
query("products").whereGreater({ price: 100 }); // price > 100
query("products").whereLess({ stock: 10 }); // stock < 10
query("products").whereGreaterEq({ rating: 4 }); // rating >= 4
query("products").whereLessEq({ discount: 50 }); // discount <= 50
query("products").whereBetween({ price: [10, 100] }); // 10 <= price <= 100
query("products").whereNotBetween({ age: [18, 65] }); // age < 18 OR age > 65
```

### Text Search

```javascript
// Case-insensitive search
query("users").whereLike({ name: "john" }); // /john/i
query("users").whereLike({ email: /.*@gmail\.com$/ });
query("users").whereNotLike({ name: "admin" });

// Alias
query("users").whereMatch({ bio: "developer" });
```

### Field Existence

```javascript
query("users").whereExists("email", "phone");
query("users").whereNotExists("deletedAt");
```

### Raw Queries

```javascript
query("users").whereRaw({ $and: [{ age: { $gt: 18 } }, { status: "active" }] });
```

## Sorting and Pagination

```javascript
// Sorting
query("users").sort("name", "asc"); // or 'a'
query("users").orderBy("age", "desc"); // or 'd'

// Pagination
query("users").limit(10).skip(20);
query("users").paginate(3, 10); // page 3, 10 per page
```

## Field Selection

```javascript
query("users").select("name", "email", "age");
```

## Query Combination

```javascript
const admins = query("users").where({ role: "admin" });
const moderators = query("users").where({ role: "moderator" });

// OR
const staff = query("users").or(admins, moderators);

// AND
const activeAdmins = query("users")
  .where({ role: "admin" })
  .and(query().where({ status: "active" }));
```

## Aggregations

```javascript
// Group by category and calculate statistics
query("products")
  .group("category")
  .sum("price", "totalPrice")
  .avg("rating", "avgRating")
  .max("stock", "maxStock")
  .min("discount", "minDiscount")
  .get();

// Count documents
const count = await query("users").where({ age: 18 }).count();
```

## Data Retrieval

```javascript
// All results
const users = await query("users").where({ age: 18 }).get();
const users = await query("users").find(); // alias

// First result
const user = await query("users").first();
const user = await query("users").getOne(); // with limit(1)
const user = await query("users").findOne(); // alias

// First N results
const topUsers = await query("users").orderBy("score", "desc").take(5);
```

## Update Operations

### `update(data, all?)`

Standard update ($set)

```javascript
query("users").where({ age: 17 }).update({ status: "minor" });
query("users").where({ age: 18 }).update({ status: "adult" }, true); // all
```

### `updateInc(data, all?)`

Increment values ($inc)

```javascript
query("users").where({ id: 123 }).updateInc({ score: 10, level: 1 });
```

### `updateMul(data, all?)`

Multiply values ($mul)

```javascript
query("products").updateMul({ price: 1.1 }, true); // +10% on all prices
```

### `updateRename(oldField, newField, all?)`

Rename a field ($rename)

```javascript
query("users").updateRename("age", "years", true);
```

### Array Operations

```javascript
// Add an element ($push)
query("users").updatePush({ badges: "veteran" });

// Add without duplicates ($addToSet)
query("users").updateAdd({ badges: "unique-badge" });

// Remove an element ($pull)
query("users").updatePull({ badges: "newbie" });

// Remove at index
query("products").updateRemoveAt("images", 0, true);

// Remove first/last element ($pop)
query("products").updatePop("prices", -1); // first
query("products").updatePop("prices", 1); // last (default)
```

### `updateUnset(fields, all?)`

Remove fields ($unset)

```javascript
query("users").updateUnset(["tempField", "oldData"], true);
query("users").updateUnset("deprecatedField");
```

### `updateRaw(data, all?)`

Raw update

```javascript
query("users").updateRaw({
  $set: { status: "active" },
  $inc: { loginCount: 1 },
});
```

## Deletion

```javascript
// Delete multiple documents (safe by default)
await query("users").where({ status: "inactive" }).delete();

// Delete ALL documents (unsafe)
await query("temp").delete(false);

// Delete a single document
await query("users").where({ id: 123 }).deleteOne();
```

## Debugging and Inspection

```javascript
const q = query("users").where({ age: 18 }).sort("name");

// Display query
console.log(q.queryToString());

// Display aggregation pipeline
console.log(q.toString());

// Debug to console
q.debug();

// Human-readable explanation
console.log(q.explain());
q.explain(true); // with automatic logging

// JSON format
console.log(q.toJson());

// SQL format (approximate)
console.log(q.toSQL());
```

## Cloning

```javascript
const baseQuery = query("users").where({ status: "active" });

// Full clone
const admins = baseQuery.clone().where({ role: "admin" });

// Clone without aggregations
const simpleClone = baseQuery.clone(true);
```

## Useful Properties

```javascript
const q = query("users");

q.model; // Mongoose model
q.collection; // MongoDB collection
q.collectionName; // Collection name
q.query; // MongoDB query object
q.pipeline; // Aggregation pipeline
```

## Advanced Examples

### Complex Search with Pagination

```javascript
const results = await query("products")
  .where({ category: "electronics" })
  .whereGreater({ rating: 4 })
  .whereBetween({ price: [100, 500] })
  .whereLike({ name: "phone" })
  .orderBy("price", "asc")
  .paginate(2, 20)
  .select("name", "price", "rating")
  .get();
```

### Grouped Statistics

```javascript
const stats = await query("orders")
  .where({ status: "completed" })
  .group("product_id")
  .sum("amount", "totalRevenue")
  .avg("amount", "avgOrderValue")
  .count()
  .get();
```

### Conditional Update

```javascript
await query("users")
  .whereBetween({ age: [13, 17] })
  .update({ category: "teen" }, true);

await query("products")
  .whereLess({ stock: 10 })
  .updatePush({ tags: "low-stock" }, true);
```

## API Reference

### Constructor

```javascript
new QueryBuilder(modelOrName: string | mongoose.Model)
```

### Query Methods

- `where(...objects)` - Add AND/OR conditions
- `whereNot(...objects)` - Negation filter
- `whereIn(objects)` - Match values in array
- `whereNotIn(objects)` - Match values not in array
- `whereGreater(objects)` - Greater than comparison
- `whereLess(objects)` - Less than comparison
- `whereGreaterEq(objects)` - Greater than or equal
- `whereLessEq(objects)` - Less than or equal
- `whereBetween(objects)` - Between two values
- `whereNotBetween(objects)` - Not between two values
- `whereLike(objects)` - Pattern matching (regex)
- `whereNotLike(objects)` - Negative pattern matching
- `whereMatch(objects)` - Alias for whereLike
- `whereExists(...fields)` - Field exists
- `whereNotExists(...fields)` - Field doesn't exist
- `whereRaw(condition)` - Raw MongoDB condition

### Sorting & Pagination

- `sort(field, direction?)` - Sort results
- `orderBy(field, direction?)` - Alias for sort
- `limit(n)` - Limit results
- `skip(n)` - Skip results
- `paginate(page?, perPage?)` - Paginate results

### Field Selection Methods

- `select(...fields)` - Select specific fields

### Query Combination Methods

- `or(...builders)` - Combine with OR
- `and(...builders)` - Combine with AND

### Aggregations Methods

- `group(stageName?)` - Group aggregations
- `sum(field, alias?)` - Sum aggregation
- `avg(field, alias?)` - Average aggregation
- `max(field, alias?)` - Maximum aggregation
- `min(field, alias?)` - Minimum aggregation
- `count()` - Count documents

### Retrieval

- `get()` - Get all matching documents
- `find()` - Alias for get
- `first()` - Get first result
- `getOne()` - Get one with limit(1)
- `findOne()` - Alias for getOne
- `take(n)` - Take N results

### Update Operations Methods

- `update(data, all?)` - Standard update
- `updateRaw(data, all?)` - Raw update
- `updateInc(data, all?)` - Increment
- `updateMul(data, all?)` - Multiply
- `updateRename(oldField, newField, all?)` - Rename field
- `updatePush(data, all?)` - Push to array
- `updateAdd(data, all?)` - Add to set (no duplicates)
- `updatePull(data, all?)` - Pull from array
- `updateUnset(fields, all?)` - Remove fields
- `updateRemoveAt(field, index, all?)` - Remove at index
- `updatePop(field, direction?, all?)` - Pop from array

### Deletion Methods

- `delete(safe?)` - Delete matching documents
- `deleteOne()` - Delete first matching document

### Utilities

- `clone(queryOnly?)` - Clone builder
- `debug()` - Log pipeline
- `explain(log?)` - Get readable explanation
- `toJson()` - Convert to JSON
- `toSQL()` - Convert to SQL (approximate)
- `toString()` - Pipeline as string
- `queryToString()` - Query as string

## License

MIT

---

**mongqb** - Simplicity and power for your MongoDB queries

By happydev
