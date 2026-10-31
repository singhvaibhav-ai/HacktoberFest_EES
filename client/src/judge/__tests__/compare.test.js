import assert from 'node:assert/strict';
import { outputsMatch } from '../compare.js';

assert.equal(outputsMatch('FizzBuzz  \n2\t\n', 'FizzBuzz\n2'), true);
assert.equal(outputsMatch('FizzBuzz  \n2\t\n', 'FizzBuzz\n3'), false);
