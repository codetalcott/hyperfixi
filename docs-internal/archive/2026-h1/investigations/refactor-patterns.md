# Reducing TypeScript duplication: A deep dive into advanced refactoring techniques

TypeScript's type system offers powerful mechanisms to eliminate redundant code while maintaining—or even improving—type safety. **The key insight is that well-designed types can serve as a single source of truth**, automatically deriving runtime validators, API contracts, and database schemas from a single definition. This report covers concrete techniques that can reduce code by 40-80% in typical scenarios, with before/after examples demonstrating each pattern.

Modern libraries like Zod, Prisma, and tRPC prove these aren't theoretical—they're production-proven patterns achieving end-to-end type safety with minimal boilerplate. The techniques divide into three categories: **type-level transformations** (compile-time only, zero runtime cost), **runtime abstractions** (generics, higher-order functions), and **build-time optimizations** (minification, tree-shaking).

---

## Mapped types transform entire object shapes automatically

Mapped types iterate over properties to create new types, eliminating the need for manual readonly, optional, or transformed versions of existing interfaces.

**Before (manual duplication):**

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

// Must manually maintain each variant
interface ReadonlyUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
}
interface PartialUser {
  id?: string;
  name?: string;
  email?: string;
}
interface NullableUser {
  id: string | null;
  name: string | null;
  email: string | null;
}
```

**After (derived automatically):**

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

type ReadonlyUser = Readonly<User>;
type PartialUser = Partial<User>;
type NullableUser = { [K in keyof User]: User[K] | null };
```

Key remapping with `as` (TypeScript 4.1+) generates new property names from existing ones:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// Result: { getName: () => string; getAge: () => number; getEmail: () => string; }
```

Filtering keys uses conditional remapping to `never`:

```typescript
type RemovePrivateFields<T> = {
  [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};
```

**Trade-off**: Complex mapped types can slow TypeScript's compiler. Deep nesting may require explicit annotations to avoid inference failures.

---

## Conditional types enable sophisticated type-level logic

Conditional types use the `T extends U ? X : Y` pattern for type-level branching, with `infer` extracting types from complex structures.

**Extracting nested types:**

```typescript
// Extract element type from any array
type ElementType<T> = T extends (infer U)[] ? U : never;
type StringEl = ElementType<string[]>; // string

// Extract return type from any function
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Recursive unwrap for nested promises
type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;
type Deep = Awaited<Promise<Promise<number>>>; // number
```

**Distributive conditional types** automatically map over unions:

```typescript
type ToArray<T> = T extends any ? T[] : never;
type Result = ToArray<string | number>; // string[] | number[]

// Prevent distribution with brackets
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type Result2 = ToArrayNonDist<string | number>; // (string | number)[]
```

The real power emerges when combining with template literal types for **string manipulation at the type level**:

```typescript
type ExtractParams<T extends string> = T extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractParams<Rest>
  : T extends `${string}:${infer Param}`
    ? Param
    : never;

type RouteParams = ExtractParams<'/users/:userId/posts/:postId'>;
// Result: "userId" | "postId"
```

---

## Generics eliminate entire categories of type-specific code

Generic functions and classes replace multiple type-specific implementations with a single definition.

**Before (one function per type):**

```typescript
function firstNumber(arr: number[]): number | undefined {
  return arr[0];
}
function firstString(arr: string[]): string | undefined {
  return arr[0];
}
function firstUser(arr: User[]): User | undefined {
  return arr[0];
}
```

**After (single generic):**

```typescript
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

first([1, 2, 3]); // number | undefined
first(['a', 'b']); // string | undefined
first([{ id: 1 }]); // { id: number } | undefined
```

**Variadic tuple types** (TypeScript 4.0+) handle heterogeneous tuples without overload signatures:

```typescript
function concat<T extends any[], U extends any[]>(a: T, b: U): [...T, ...U] {
  return [...a, ...b] as [...T, ...U];
}

const result = concat([1, 2] as const, ['a', 'b'] as const);
// Type: readonly [1, 2, "a", "b"] - exact tuple preserved
```

**Generic constraints** with `extends` prevent invalid usage while maintaining flexibility:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 30 };
getProperty(user, 'name'); // string
getProperty(user, 'foo'); // Compile error: "foo" not in keyof user
```

---

## Higher-order functions and factories reduce repetitive logic

Function factories create specialized functions from templates, eliminating boilerplate while preserving type safety.

```typescript
// Factory: multiplier generator
const createMultiplier =
  (factor: number) =>
  (x: number): number =>
    x * factor;

const double = createMultiplier(2);
const triple = createMultiplier(3);
double(5); // 10 - return type inferred correctly
```

**Pipe composition** chains transformations with full type inference:

```typescript
function pipe<A, B>(fn1: (a: A) => B): (a: A) => B;
function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
function pipe<A, B, C, D>(fn1: (a: A) => B, fn2: (b: B) => C, fn3: (c: C) => D): (a: A) => D;
function pipe(...fns: Function[]) {
  return (x: any) => fns.reduce((v, f) => f(v), x);
}

const transform = pipe(
  (x: number) => x + 1,
  x => x * 2,
  x => x.toString()
);
// Type: (x: number) => string
```

**Point-free utilities** extract common operations:

```typescript
const prop =
  <T, K extends keyof T>(key: K) =>
  (obj: T): T[K] =>
    obj[key];
const map =
  <A, B>(fn: (a: A) => B) =>
  (arr: A[]): B[] =>
    arr.map(fn);

// Point-free: no explicit parameter naming
const getNames = pipe(filter<User>(prop('active')), map(prop('name')));
```

---

## TypeScript 5.x features streamline common patterns

**`const` type parameters** (TS 5.0) preserve literal types without `as const`:

```typescript
// Before: required explicit as const
const old = getConfig({ routes: ['/home', '/users'] } as const);

// After: const modifier on generic preserves literals
function getConfig<const T extends { routes: readonly string[] }>(config: T): T {
  return config;
}
const config = getConfig({ routes: ['/home', '/users'] });
// Type: { routes: readonly ["/home", "/users"] }
```

**`satisfies` operator** (TS 4.9) validates type compliance without widening:

```typescript
const colors = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, [number, number, number] | string>;

colors.red.map(x => x); // Works! TypeScript knows it's an array
```

**TC39 decorators** (TS 5.0) provide type-safe metaprogramming:

```typescript
function loggedMethod<This, Args extends any[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext
) {
  return function (this: This, ...args: Args): Return {
    console.log(`Entering ${String(context.name)}`);
    return target.call(this, ...args);
  };
}

class Service {
  @loggedMethod
  process(data: string) {
    return data.toUpperCase();
  }
}
```

---

## Build-time optimization yields significant bundle reductions

| Optimization             | Typical Savings                           | Implementation Effort |
| ------------------------ | ----------------------------------------- | --------------------- |
| `importHelpers` + tslib  | **5-15%** (up to 500KB in large projects) | Low                   |
| `const enum` over `enum` | 1-5%                                      | Low                   |
| `verbatimModuleSyntax`   | Enables tree-shaking                      | Low                   |
| Named exports pattern    | 10-30%                                    | Medium                |
| `sideEffects: false`     | 10-50%                                    | Low                   |

**Critical tsconfig.json settings for applications:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "importHelpers": true,
    "removeComments": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true
  }
}
```

**`const enum` inlines values at compile time:**

```typescript
// Regular enum: creates runtime object (~100 bytes)
enum Status {
  Active = 1,
  Inactive = 2,
}

// const enum: inlined to literal (0 bytes)
const enum Status {
  Active = 1,
  Inactive = 2,
}
const s = Status.Active; // Compiles to: const s = 1;
```

**Tree-shakeable exports require named exports, not default objects:**

```typescript
// ❌ Not tree-shakeable
export default { add, subtract, multiply };

// ✅ Tree-shakeable
export { add, subtract, multiply };
```

---

## Real-world libraries demonstrate production-grade patterns

### Zod: Single source of truth for types and validation

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

// Derive type automatically - NO DUPLICATION
type User = z.infer<typeof UserSchema>;

// Runtime validation synchronized with types
const user = UserSchema.parse(apiResponse);
```

### tRPC: End-to-end type safety without codegen

```typescript
// Server: define procedures with inference
const appRouter = t.router({
  getUser: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => ({ id: input.id, name: 'Alice' })),
});

export type AppRouter = typeof appRouter;

// Client: full type safety, no generated code
const client = createTRPCProxyClient<AppRouter>({
  /* ... */
});
const user = await client.getUser.query({ id: '123' });
// user is typed as { id: string; name: string }
```

### Prisma: Query-dependent return types

```typescript
// Return type changes based on include/select options
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true },
});
// Type automatically includes: { ...UserFields, posts: Post[] }

const userEmail = await prisma.user.findUnique({
  where: { id: 1 },
  select: { email: true },
});
// Type narrowed to: { email: string }
```

### ts-pattern: Exhaustive pattern matching

```typescript
import { match, P } from 'ts-pattern';

type Response =
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: Error };

const result = match(response)
  .with({ status: 'loading' }, () => <Spinner />)
  .with({ status: 'success' }, ({ data }) => <UserList users={data} />)
  .with({ status: 'error' }, ({ error }) => <Error msg={error.message} />)
  .exhaustive();  // Compile error if a case is missing
```

---

## Trade-offs between brevity and maintainability

**When aggressive type-level programming helps:**

- Deriving multiple types from a single source definition
- Eliminating manual synchronization between types and runtime code
- Building library APIs with flexible, inference-driven interfaces

**When it harms readability:**

- Deeply nested conditional types (error messages become cryptic)
- Recursive types approaching the ~100-500 level depth limit
- Complex template literal manipulations that obscure intent

**Performance considerations by technique:**

| Pattern                  | Compile-time Impact |                   Runtime Cost |
| ------------------------ | ------------------: | -----------------------------: |
| Mapped types             |            Moderate |                           Zero |
| Conditional types        |        Can be heavy |                           Zero |
| Generics                 |             Minimal |                           Zero |
| Higher-order functions   |                None |        Slight closure overhead |
| Decorators               |             Minimal |            One-time setup cost |
| Runtime validation (Zod) |                None | **~13KB gzipped** + parse time |

## Conclusion

The most impactful techniques share a common principle: **define structure once, derive everything else**. Mapped types eliminate manual type variants. `z.infer<>` synchronizes validation with types. tRPC's `typeof appRouter` replaces API contracts.

For immediate wins, focus on: enabling `importHelpers`, using `const enum` for internal constants, preferring named exports, and marking packages as side-effect-free. For architectural improvements, adopt the single-source-of-truth pattern with tools like Zod or Drizzle. The investment in learning advanced type features pays dividends in reduced maintenance burden and eliminated classes of bugs.

TypeScript 5.x's `const` type parameters, `satisfies` operator, and finalized decorators further reduce the friction between type safety and brevity—making the choice increasingly clear: well-typed code is also the shortest code.
