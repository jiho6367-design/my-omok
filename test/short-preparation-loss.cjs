'use strict';
const assert = require('node:assert/strict');
const createForestEngine = require('../src/search-engine.js');
const { createEngine: createReaderEngine } = require('../src/reader-engine.js');
const { checkFinalists } = require('../src/parallel-analysis.js');
const rules = require('../tools/counter-rules.cjs');
const serialize = require('../tools/counter-dag.cjs');
const verify = require('../tools/verify-counter.cjs');

const index = c => (Number(c.slice(1)) - 1) * 15 + c.charCodeAt(0) - 65;
const settings = { model: null, strategy: false, optimized: true, firstPlayer: 2,
  proofDetails: true, counterProofDetails: true };
const defender = 2;
const attacker = 1;
function board(own, opposition) {
  const R = rules(new Array(225).fill(0));
  const mine = own.split(' ').map(index);
  const theirs = opposition.split(' ').map(index);
  assert.equal(mine.length, theirs.length);
  for (let i = 0; i < mine.length; i++) {
    for (const [move, player] of [[mine[i], defender], [theirs[i], attacker]]) {
      assert(R.legal(move, player));
      R.put(move, player);
      assert(!R.exact(move, player));
    }
  }
  return R.board;
}
function verifyAttack(after, proof) {
  const result = verify(after, serialize(proof, { attacker }), { attacker, loss: false, limitMs: 5000 });
  assert(result.verified && result.boardRestored, result.error);
  return result.stats.defenses;
}
const engine = createForestEngine(settings);

// One open three can be cut directly, but both legal cuts concede a quiet
// attack. The first proof stage must cover each such non-VCF continuation.
const quick = board('I6 I7 K7 G10', 'G9 H9 I9 H10');
const quickOriginal = quick.slice();
let checkedDefenses = 0;
const rows = ['F9', 'J9'].map((c, n) => ({ i: index(c), score: -10000000 - n }));
const checks = checkFinalists(engine, quick, defender, rows, 1600);
assert.equal(checks.length, 2);
for (const check of checks) {
  assert(check.complete && check.refuted && check.rejection?.verifiedRefutation);
  const proof = check.rejection.preparationTrap;
  assert.equal(proof.quiet, 1);
  assert.equal(proof.maxPlies, 19);
  assert.equal(proof.proof.type, 'move');
  assert.equal(check.shortPreparationStages.length, 1);
  const after = quick.slice();
  after[check.i] = defender;
  assert.equal(proof.entryBoardKey, after.join(''));
  assert(!engine.forcing(after, attacker, 19, 200).proof);
  checkedDefenses += verifyAttack(after, proof.proof);
}
assert.deepEqual(quick, quickOriginal);

// A second fixture requires the second preparation stage. All legal roots
// must be replayed before the Reader can declare the position lost.
const mixed = board('G7 A1 E9 F9 G9 G10 H10', 'G8 H8 H9 I9 H11 I11 K11');
const mixedOriginal = mixed.slice();
const move = index('J11');
assert(engine.inspect(mixed, move, defender).legal);
const after = mixed.slice();
after[move] = defender;
const short = engine.shortPreparationTrap(after, defender, 2000);
assert(short.complete && short.proof);
assert.deepEqual(short.stages.map(s => s.quiet), [1, 2]);
assert.equal(short.quiet, 2);
checkedDefenses += verifyAttack(after, short.proof);
const shallowReader = createReaderEngine(15, mixed, settings);
const shallow = shallowReader.counterLoss(defender, 500, 19, 1);
assert(shallow.complete && !shallow.lossProven);
const reader = createReaderEngine(15, mixed, settings);
const result = reader.analyze(defender, 6000);
assert.equal(result.kind, 'lost');
assert.equal(result.depth, 0, 'A finished proof needs no finite comparison depth');
assert.equal(result.counterProof.quiet, 2);
assert(result.lossCoverage.complete);
const complete = result.completeLossCertificate;
assert(complete.complete && complete.entryBoardKey === mixed.join(''));
const certificate = serialize(null, { attacker, roots: complete.branches });
const replay = verify(mixed, certificate, { attacker, loss: true, limitMs: 5000 });
assert(replay.verified && replay.boardRestored, replay.error);
assert(complete.branches.some(row => row.proof.type === 'move'));
assert.equal(complete.branches.length, Array.from(mixed.keys()).filter(i => rules(mixed).legal(i, defender)).length);
assert.deepEqual(mixed, mixedOriginal);

const timedOut = engine.shortPreparationTrap(after, defender, 0);
assert.equal(timedOut.complete, false);
assert.equal(timedOut.proof, null);
assert.deepEqual(timedOut.stages, []);
console.log(JSON.stringify({ passed: true, shortlistRefutations: checks.length,
  legalLossRoots: complete.branches.length, verifiedQuietDefenses: checkedDefenses + replay.stats.defenses,
  scope: 'Small generated positions, 19-ply proof scheduling and independent complete response replay' }));
