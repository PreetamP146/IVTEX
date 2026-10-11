const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

class AuthController {
  constructor({ authService, tokenService, isProduction }) {
    this.authService = authService;
    this.tokenService = tokenService;
    this.isProduction = isProduction;
  }

  register = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await this.authService.register(req.body);
    this.#setRefreshCookie(res, refreshToken);
    sendSuccess(res, {
      status: 201,
      message: 'Registration successful',
      data: { user, accessToken },
    });
  });

  login = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await this.authService.login(req.body);
    this.#setRefreshCookie(res, refreshToken);
    sendSuccess(res, { message: 'Login successful', data: { user, accessToken } });
  });

  refresh = asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await this.authService.refresh(
      req.cookies[REFRESH_COOKIE]
    );
    this.#setRefreshCookie(res, refreshToken);
    sendSuccess(res, { message: 'Token refreshed successfully', data: { user, accessToken } });
  });

  logout = asyncHandler(async (req, res) => {
    await this.authService.logout(req.cookies[REFRESH_COOKIE]);
    this.#clearRefreshCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' });
  });

  me = asyncHandler(async (req, res) => {
    sendSuccess(res, { message: 'Profile fetched successfully', data: req.user });
  });

  changePassword = asyncHandler(async (req, res) => {
    await this.authService.changePassword(req.user._id, req.body);
    this.#clearRefreshCookie(res);
    sendSuccess(res, { message: 'Password changed successfully. Please log in again' });
  });

  #cookieOptions() {
    return {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    };
  }

  #setRefreshCookie(res, token) {
    res.cookie(REFRESH_COOKIE, token, {
      ...this.#cookieOptions(),
      maxAge: this.tokenService.refreshMaxAgeMs,
    });
  }

  #clearRefreshCookie(res) {
    res.clearCookie(REFRESH_COOKIE, this.#cookieOptions());
  }
}

module.exports = AuthController;
