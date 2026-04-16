import { test, expect } from "bun:test"
import t from "reflect-types";
import stream from "node:stream"

import { contract, emptyContract, implement } from "./types.js"
import { connect } from "./rpc.js"
import { FailedValidationError } from "./error.js";
import { sleep } from "bun";
import type { Transport } from "./transport.js";
import serveBunTCP from "./serve/bunTCP.js";

const leftContract = contract({
  methods: {
    getState: t.callable([] as const, t.number()),
    setState: t.callable([ t.number() ] as const, t.undefined()),
  },
  events: {
    someevent: t.string(),
  }
});

const rightContract = contract({
  methods: {
    getState: t.callable([] as const, t.number()),
    setState: t.callable([ t.number() ] as const, t.undefined()),
    getLength: t.callable([ t.string() ] as const, t.number()),
  }
});

function createDuplex(): [Transport, Transport] {

  const input1 = new stream.Readable({ read() { } });
  const input2 = new stream.Readable({ read() { } });

  const output1 = new stream.Writable({
    write(chunk, encoding, callback) {
      input2.push(chunk, encoding);
      callback();
    },
  });
  const output2 = new stream.Duplex({
    write(chunk, encoding, callback) {
      input1.push(chunk, encoding);
      callback();
    },
  });

  return [
    { input: input1, output: output1, async close() {}, },
    { input: input2, output: output2, async close() {}, },
  ];
}

const leftImpl = implement(leftContract, rightContract)
  .state<{ foo: number; }>()
  // .methods(stateHandlers())
  .methods({
    getState({ state: { foo } }) {
      return foo;
    },
    setState({ state }, newFoo) {
      state.foo = newFoo;
    },
  })
  .finish();

const rightImpl = implement(rightContract, leftContract)
  .state<{ foo: number; }>()
  .methods({
    getState({ state }) {
      return state.foo;
    },
    setState({ state}, newState) {
      state.foo = newState;
    },
    getLength(_, s) {
      return s.length;
    }
  })
  .finish();

test('can call methods on the associated client', done => {

  const leftContract = contract({
    methods: {
      pong: t.callable([ t.any() ] as const, t.void()),
    }
  });

  const rightContract = contract({
    methods: {
      ping: t.callable([ t.any() ] as const, t.void()),
    }
  });

  const PASSED_IN = 42;

  const leftImpl = implement(leftContract, rightContract)
    // .methods(stateHandlers())
    .method('pong', (_, x) => {
        expect(x).toStrictEqual(PASSED_IN);
        done();
    })
    .finish();

  const rightImpl = implement(rightContract, leftContract)
    .method('ping', (req, x) => {
      req.client.pong(x);
    })
    .finish()

  const [leftTransport, rightTransport] = createDuplex();
  const leftServer = connect(leftImpl, leftTransport, {});
  const rightServer = connect(rightImpl, rightTransport, {});

  leftServer.ping(PASSED_IN);

});


test('can call methods on both sides', async () => {

  const [leftTransport, rightTransport] = createDuplex();
  const left = connect(leftImpl, leftTransport, { foo: 42 });
  const right = connect(rightImpl, rightTransport, { foo: 33 });

  expect(await left.callMethod('getLength', ["foobar"])).toStrictEqual(6);
  expect(await left.callMethod('getState', [])).toStrictEqual(33);
  expect(await right.callMethod('getState', [])).toStrictEqual(42);

  expect(await left.getLength("foobar")).toStrictEqual(6);
  expect(await left.getState()).toStrictEqual(33);
  expect(await right.getState()).toStrictEqual(42);

  left.close();
  right.close();

});

test('throws an error on invalid param count', async () => {
  const [leftTransport, rightTransport] = createDuplex();
  const left = connect(leftImpl, leftTransport, { foo: 42 });
  const right = connect(rightImpl, rightTransport, { foo: 33 });

  expect(left.callMethod('getLength',
    // @ts-expect-error Deliberatly added a param
    [ "foo", "bar" ]
  )).rejects.toBeInstanceOf(Error); // TODO be more specific
  expect(left.callMethod('getLength',
    // @ts-expect-error Deliberatly removed a param
    [ ]
  )).rejects.toBeInstanceOf(Error); // TODO be more specific
});

test('throws an error on invalid return', async () => {

  const leftContract = contract({
    methods: {
      returnInvalid: t.callable([] as const, t.number()),
    }
  });

  const rightContract = emptyContract();

  const leftImpl = implement(leftContract, rightContract)
    // @ts-expect-error Wrong function return type on purpose
    .method('returnInvalid', () => {
      return "a string";
    })
    .finish();

  const rightImpl = implement(rightContract, leftContract)
    .finish();

  const [leftTransport, rightTransport] = createDuplex();
  const left = connect(leftImpl, leftTransport, { foo: 42 });
  const right = connect(rightImpl, rightTransport, { foo: 33 });

  expect(right.callMethod('returnInvalid', [])).rejects.toBeInstanceOf(FailedValidationError);
});

test('can send events', done => {
  const [leftTransport, rightTransport] = createDuplex();
  const left = connect(leftImpl, leftTransport, { foo: 42 });
  const right = connect(rightImpl, rightTransport, { foo: 33 });

  left.getEvent('someevent').subscribe(msg => {
    expect(msg).toStrictEqual('foo');
    done();
  });

  right.notify('someevent', 'foo');

});


test('can send a promise that resolves later', async () => {

  const leftContract = emptyContract();

  const rightContract = contract({
    methods: {
      slow11: t.callable([] as const, t.object({ slow: t.promise(t.number()) })),
    }
  });

  const leftImpl = implement(leftContract, rightContract).finish();

  const rightImpl = implement(rightContract, leftContract)
    .method('slow11', () => {
      return { slow: (async () => { await sleep(250); return 11; })() };
    })
    .finish();

  const [leftTransport, rightTransport] = createDuplex();
  const right = connect(leftImpl, leftTransport, { foo: 42 });
  const left = connect(rightImpl, rightTransport, { foo: 33 });

  const { slow: slow2 } = await right.callMethod('slow11', []);
  expect(slow2).resolves.toStrictEqual(11);

  const { slow } = await right.slow11();
  expect(slow).resolves.toStrictEqual(11);
});

// test('can send over TCP', async () => {
//   serveBunTCP({ impl: rightImpl, port: 2000, createState: () => ({ foo: 33 }) });
//   await sleep(100);
//   const socket = await Bun.connect<Transport>({
//     hostname: 'localhost',
//     port: 2000,
//     socket: {
//       async open(socket) {
//         const transport = {
//           input: new stream.Readable({ read() { } }),
//           output: new stream.Writable({
//             write(chunk, encoding, callback) {
//               socket.write(chunk);
//             },
//           }),
//           async close() {
//           }
//         }
//         const left = connect(
//           leftImpl,
//           transport,
//           { foo: 42 },
//         );
//         socket.data = transport;
//         expect(await left.callMethod('getLength', ["foobar"])).toStrictEqual(6);
//         expect(await left.callMethod('getState', [])).toStrictEqual(33);
//       },
//       data(socket, data) {
//         socket.data.input.push(data);
//       },
//     }
//   });
// });
