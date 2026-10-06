import assert from 'node:assert/strict'
import { inferIndonesianRegister } from './indonesianRegister.js'

assert.equal(inferIndonesianRegister('how are you'), 'colloquial')
assert.equal(inferIndonesianRegister('Thanks!'), 'colloquial')
assert.equal(inferIndonesianRegister('Please be advised that your application was received.'), 'formal')
assert.equal(inferIndonesianRegister('Dear Sir, kindly submit the medical certificate.'), 'formal')
assert.equal(inferIndonesianRegister('Madam, please advise on the next steps.'), 'formal')
assert.equal(inferIndonesianRegister(''), 'colloquial')

console.log('indonesianRegister.smoke ok')
