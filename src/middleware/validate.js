const REQUEST_PARTS = ['params', 'query', 'body'];

const validate = (schemas) => (req, res, next) => {
  try {
    REQUEST_PARTS.forEach((part) => {
      if (schemas[part]) {
        req[part] = schemas[part].parse(req[part]);
      }
    });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validate;
