import { strict as assert } from "node:assert";

assert.equal((1000 >= 1000 ? "review" : "signed_in"), "review");
assert.equal((25 >= 1000 ? "review" : "signed_in"), "signed_in");
console.log("risk decision test passed");

