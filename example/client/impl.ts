import { implement } from "awesomerpc";
import { clientContract } from "./contract.js";
import { serverContract } from "../server/contract.js";

export const clientImpl = implement(clientContract, serverContract)
    .method('refresh', () => {
        window.location.reload();
    })
    .finish();
