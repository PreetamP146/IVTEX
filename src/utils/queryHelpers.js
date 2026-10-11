const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchCondition = (fields, term) => {
  if (!term) {
    return {};
  }
  const pattern = new RegExp(escapeRegex(term), 'i');
  return { $or: fields.map((field) => ({ [field]: pattern })) };
};

const rangeCondition = (field, from, to) => {
  const range = {};
  if (from !== undefined && from !== null) {
    range.$gte = from;
  }
  if (to !== undefined && to !== null) {
    range.$lte = to;
  }
  return Object.keys(range).length ? { [field]: range } : {};
};

const equalsCondition = (field, value) =>
  value === undefined || value === null ? {} : { [field]: value };

const combineConditions = (...conditions) => {
  const active = conditions.filter((c) => c && Object.keys(c).length > 0);
  if (active.length === 0) {
    return {};
  }
  return active.length === 1 ? active[0] : { $and: active };
};

const buildSort = (sortBy, order) => ({
  [sortBy]: order === 'asc' ? 1 : -1,
  _id: -1,
});

const idOf = (value) => (value && value._id ? value._id : value);

module.exports = {
  escapeRegex,
  searchCondition,
  rangeCondition,
  equalsCondition,
  combineConditions,
  buildSort,
  idOf,
};
