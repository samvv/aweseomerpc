import { implement } from "awesomerpc";
import { petStoreClient } from "./contracts.js";

export const petStoreClientImpl = implement(petStoreClient)
    .method('refresh', (_ctx) => {
        window.location.reload();
    })
    .finish();
