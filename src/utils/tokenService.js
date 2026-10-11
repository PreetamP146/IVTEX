const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class TokenService {
  constructor({ accessSecret, refreshSecret, accessExpiresIn, refreshTtlDays }) {
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessExpiresIn = accessExpiresIn;
    this.refreshTtlDays = refreshTtlDays;
  }

  signAccessToken(user) {
    return jwt.sign({ sub: String(user._id), role: user.role }, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
    });
  }

  signRefreshToken(user) {
    return jwt.sign({ sub: String(user._id), jti: crypto.randomUUID() }, this.refreshSecret, {
      expiresIn: `${this.refreshTtlDays}d`,
    });
  }

  verifyAccessToken(token) {
    return jwt.verify(token, this.accessSecret);
  }

  verifyRefreshToken(token) {
    return jwt.verify(token, this.refreshSecret);
  }

  hash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  get refreshMaxAgeMs() {
    return this.refreshTtlDays * 24 * 60 * 60 * 1000;
  }
}

module.exports = TokenService;
