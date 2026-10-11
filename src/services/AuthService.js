const ApiError = require('../utils/ApiError');
const { ROLES } = require('../constants');

class AuthService {
  constructor({ userRepository, passwordHasher, tokenService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  async register({ name, email, phone, password }) {
    if (await this.userRepository.findByEmail(email)) {
      throw ApiError.conflict('An account with this email already exists');
    }
    const user = await this.userRepository.create({
      name,
      email,
      phone,
      password: await this.passwordHasher.hash(password),
      role: ROLES.SALES_EXECUTIVE,
    });
    const tokens = await this.#issueTokens(user);
    return { user, ...tokens };
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmailWithSecrets(email);
    const passwordMatches =
      user && (await this.passwordHasher.compare(password, user.password));
    if (!passwordMatches) {
      throw ApiError.unauthorized('Invalid email or password');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('This account has been deactivated');
    }
    const tokens = await this.#issueTokens(user, { recordLogin: true });
    return { user: await this.userRepository.findById(user._id), ...tokens };
  }

  async refresh(refreshToken) {
    const payload = this.#verifyRefreshToken(refreshToken);
    const user = await this.userRepository.findByIdWithSecrets(payload.sub);
    if (!user || !user.isActive || user.refreshTokenHash !== this.tokenService.hash(refreshToken)) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
    const tokens = await this.#issueTokens(user);
    return { user: await this.userRepository.findById(user._id), ...tokens };
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      return;
    }
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      await this.userRepository.clearRefreshToken(payload.sub);
    } catch (error) {
      return;
    }
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await this.userRepository.findByIdWithSecrets(userId);
    if (!(await this.passwordHasher.compare(currentPassword, user.password))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    await this.userRepository.updatePassword(userId, await this.passwordHasher.hash(newPassword));
  }

  async #issueTokens(user, { recordLogin = false } = {}) {
    const accessToken = this.tokenService.signAccessToken(user);
    const refreshToken = this.tokenService.signRefreshToken(user);
    const hash = this.tokenService.hash(refreshToken);
    if (recordLogin) {
      await this.userRepository.recordLogin(user._id, hash);
    } else {
      await this.userRepository.setRefreshTokenHash(user._id, hash);
    }
    return { accessToken, refreshToken };
  }

  #verifyRefreshToken(refreshToken) {
    if (!refreshToken) {
      throw ApiError.unauthorized('Refresh token is missing');
    }
    try {
      return this.tokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }
}

module.exports = AuthService;
