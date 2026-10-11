const ApiError = require('../utils/ApiError');
const { DEAL_STAGES } = require('../constants');

const { QUALIFICATION, DISCOVERY, PROPOSAL, NEGOTIATION, WON, LOST } = DEAL_STAGES;

const ACTIVE_STAGES = Object.freeze([QUALIFICATION, DISCOVERY, PROPOSAL, NEGOTIATION]);
const CLOSED_STAGES = Object.freeze([WON, LOST]);
const MAX_CLOSING_HORIZON_YEARS = 5;

const TRANSITIONS = Object.freeze({
  [QUALIFICATION]: [DISCOVERY, LOST],
  [DISCOVERY]: [QUALIFICATION, PROPOSAL, LOST],
  [PROPOSAL]: [DISCOVERY, NEGOTIATION, WON, LOST],
  [NEGOTIATION]: [PROPOSAL, WON, LOST],
  [WON]: [],
  [LOST]: [],
});

const DEFAULT_PROBABILITY = Object.freeze({
  [QUALIFICATION]: 10,
  [DISCOVERY]: 25,
  [PROPOSAL]: 50,
  [NEGOTIATION]: 75,
});

const isClosed = (stage) => CLOSED_STAGES.includes(stage);

const calculateExpectedRevenue = (value, probability) => Math.round(value * probability) / 100;

const defaultProbabilityFor = (stage) => DEFAULT_PROBABILITY[stage];

const assertClosingDateAllowed = (date) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (date < startOfToday) {
    throw ApiError.badRequest('Expected closing date cannot be in the past');
  }
  const horizon = new Date(startOfToday);
  horizon.setFullYear(horizon.getFullYear() + MAX_CLOSING_HORIZON_YEARS);
  if (date > horizon) {
    throw ApiError.badRequest(
      `Expected closing date cannot be more than ${MAX_CLOSING_HORIZON_YEARS} years ahead`
    );
  }
};

const assertEditable = (deal) => {
  if (isClosed(deal.stage)) {
    throw ApiError.conflict(`A ${deal.stage} deal can no longer be edited`);
  }
};

const assertStageTransition = (current, next) => {
  if (isClosed(current)) {
    throw ApiError.conflict(`A ${current} deal cannot be moved to another stage`);
  }
  if (current === next) {
    throw ApiError.badRequest(`Deal is already in the ${current} stage`);
  }
  if (!TRANSITIONS[current].includes(next)) {
    throw ApiError.badRequest(`Deal cannot move from ${current} to ${next}`);
  }
};

const assertCanBeWon = (deal) => {
  if (!(deal.value > 0)) {
    throw ApiError.badRequest('A won deal must have a value greater than zero');
  }
  if (!deal.expectedClosingDate) {
    throw ApiError.badRequest('A won deal must have an expected closing date');
  }
  if (!deal.customer) {
    throw ApiError.badRequest('A won deal must be linked to a customer');
  }
};

const assertLostReason = (reason) => {
  if (!reason || reason.trim().length < 3) {
    throw ApiError.badRequest('A reason is required when marking a deal as lost');
  }
};

module.exports = {
  ACTIVE_STAGES,
  CLOSED_STAGES,
  isClosed,
  calculateExpectedRevenue,
  defaultProbabilityFor,
  assertClosingDateAllowed,
  assertEditable,
  assertStageTransition,
  assertCanBeWon,
  assertLostReason,
};
