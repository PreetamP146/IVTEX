const bcrypt = require('bcryptjs');

class PasswordHasher {
  constructor(saltRounds) {
    this.saltRounds = saltRounds;
  }

  hash(plain) {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain, hashed) {
    return bcrypt.compare(plain, hashed);
  }
}

module.exports = PasswordHasher;
