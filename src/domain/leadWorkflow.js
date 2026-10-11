const ApiError = require('../utils/ApiError');
const { LEAD_STATUSES } = require('../constants');

const { NEW, CONTACTED, QUALIFIED, UNQUALIFIED, CONVERTED, LOST } = LEAD_STATUSES;

const TRANSITIONS = Object.freeze({
  [NEW]: [CONTACTED, QUALIFIED, UNQUALIFIED, LOST],
  [CONTACTED]: [QUALIFIED, UNQUALIFIED, LOST],
  [QUALIFIED]: [CONTACTED, UNQUALIFIED, LOST],
  [UNQUALIFIED]: [CONTACTED, LOST],
  [LOST]: [CONTACTED],
  [CONVERTED]: [],
});

const assertStatusTransition = (current, next) => {
  if (current === next) {
    throw ApiError.badRequest(`Lead is already ${current}`);
  }
  if (next === CONVERTED) {
    throw ApiError.badRequest('Use the convert endpoint to convert a qualified lead');
  }
  if (current === CONVERTED) {
    throw ApiError.conflict('A converted lead cannot change status');
  }
  if (!TRANSITIONS[current].includes(next)) {
    throw ApiError.badRequest(`Lead cannot move from ${current} to ${next}`);
  }
};

const assertConvertible = (lead) => {
  if (lead.status === CONVERTED) {
    throw ApiError.conflict('Lead has already been converted');
  }
  if (lead.status !== QUALIFIED) {
    throw ApiError.badRequest('Only qualified leads can be converted');
  }
};

module.exports = { assertStatusTransition, assertConvertible };
