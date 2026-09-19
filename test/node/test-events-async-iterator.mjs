import assert from "node:assert";
import test from "node:test";

import { EventEmitter, on } from "../../src/runtime/node/events.ts";

// %AsyncIteratorPrototype% derived the way a native engine exposes it.
const REAL_ASYNC_ITERATOR_PROTOTYPE = Object.getPrototypeOf(
  Object.getPrototypeOf(async function* () {}.prototype),
);

test("events module evaluates without touching engine intrinsics at import time", () => {
  // The import itself is the assertion: deriving %AsyncIteratorPrototype% must
  // stay out of module scope so that bundles targeting < ES2018 (where the
  // async generator function is down-leveled and its prototype chain is gone)
  // can still evaluate the module.
  assert.strictEqual(typeof EventEmitter, "function");
  assert.strictEqual(typeof on, "function");
});

test("async iterator created by on() inherits %AsyncIteratorPrototype%", () => {
  const emitter = new EventEmitter();
  const iterator = on(emitter, "data");
  assert.strictEqual(
    Object.getPrototypeOf(iterator),
    REAL_ASYNC_ITERATOR_PROTOTYPE,
  );
});

test("on() yields emitted events", async () => {
  const emitter = new EventEmitter();
  const received = [];
  const finished = (async () => {
    for await (const value of on(emitter, "data")) {
      received.push(value);
      if (received.length === 2) {
        break;
      }
    }
  })();
  emitter.emit("data", "a");
  emitter.emit("data", "b");
  await finished;
  assert.deepStrictEqual(received, [["a"], ["b"]]);
});
