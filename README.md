# TypedRPC

TypedRPC is an easy-to-use RPC framework written in TypeScript. It features
advanced reflection capabilities, allowing you to define type-safe in nothing
more than a bit of TypeScript. No copy-pasting or code generators needed!

## Quick Start

First, you need to define a _contract_ for your API. A contract is kind of like
a TypeScript interface: it defines what methods (and events) are allowed.

```ts
import { types as t } from "reflect-types";
import { contract } from "typedrpc";

const productT = t.object({
    id: t.uuid4(),
    title: t.string(),
    description: t.optional(t.string()),
    createdAt: t.date(),
    updatedAt: t.date(),
});

// This server will be reachable by any browser client that connects to it
const petStoreServer = contract({
    methods: {
        getProducts: t.callable([] as const, t.array(productT)),
        authenticate: t.callable(
            [
                t.string(), // username
                t.string(), // password
            ] as const,
            t.boolean(), // success or not
        ),
    },
});
```

Next, it is time to implement the client side and server side.

```ts
import { implement } from "typedrpc";

type ServerState = {
    loggedIn: boolean;
}

const petStoreServerImpl = implement(petStoreServer)
    .state<ServerState>()
    .method('authenticate', (ctx, username, password) => {
        if (username === 'foobar' && password === '12345') {]
            return ctx.loggedIn = true;
        }
        return false;
    })
    .method('getProducts', (_ctx) => {
        return [
            {
                id: '6930bc19-6337-4d94-b31d-f81d55a85873',
                title: 'Bag of cat food',
                createdAt: new Date('2026-03-14T20:00:10.662Z'),
                updatedAt: new Date('2026-03-14T20:00:28.639Z'),
            }
        ];
    })
    .finish();
```

Next, fire up a RPC server. For Bun with Hono, this might look something like this:

```ts
import { Hono } from "hono";
import { websocket } from "hono/bun";
import serve from "typedrpc/lib/serve/hono"

const app = new Hono();

app.get('/ws', serve(petStoreServerImpl));

export default {
  fetch: app.fetch,
  websocket,
}

export type App = typeof app;
```
