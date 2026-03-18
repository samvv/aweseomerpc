import t from "reflect-types";
import { contract } from "awesomerpc";

import { productT } from "../types.js";

export const serverContract = contract({
    methods: {
        getBasket: t.callable([] as const, t.object({ items: t.array(productT) })),
        clearBasket: t.callable([] as const, t.void_()),
        addToBasket: t.callable([ t.uuid4() ] as const, t.void_()),
        login: t.callable(
            [
                t.string(), // username
                t.string(), // password
            ] as const,
            t.boolean(), // success or not
        ),
        logout: t.callable([] as const, t.void_()),
    },
});

