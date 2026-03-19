import { contract } from "awesomerpc";
import t from "reflect-types";

export const clientContract = contract({
    // These methods the server can call on the client at any time
    methods: {
        refresh: t.callable([] as const, t.void()),
    },
    events: {
        logout: t.undefined(),
    },
});

