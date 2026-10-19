import { AuthService } from "../services/auth.service.js";
import {
  toRegisterDto,
  toLoginDto,
  toForgotPasswordDto,
  toVerifyOtpDto,
  toResendOtpDto,
  toResetPasswordDto,
  toPublicUser,
} from "../dto/auth.dto.js";
import {
  validateRegisterRequest,
  validateLoginRequest,
  validateForgotPasswordRequest,
  validateVerifyOtpRequest,
  validateResendOtpRequest,
  validateResetPasswordRequest,
} from "../validators/auth.validator.js";
import { CookieProvider } from "../providers/cookie.provider.js";
import { COOKIE_NAMES, HTTP_STATUS } from "../constants/auth.constants.js";
import { maskEmail } from "../utils/email.util.js";

/**
 * AuthController — только routing-логика: валидировать → вызвать сервис → ответить.
 * Express 5 сам передаёт отклонённые промисы в обработчик ошибок.
 */
export const AuthController = {
  csrf: (req, res) => {
    const token =
      req.cookies?.[COOKIE_NAMES.csrf] ?? CookieProvider.generateCsrfToken();
    CookieProvider.setCsrf(res, token);
    res.status(HTTP_STATUS.OK).json({ success: true, csrfToken: token });
  },

  register: async (req, res) => {
    validateRegisterRequest(req.body);
    const result = await AuthService.register(toRegisterDto(req.body));
    res.status(HTTP_STATUS.CREATED).json({ success: true, ...result });
  },

  login: async (req, res) => {
    validateLoginRequest(req.body);
    const { sid, user } = await AuthService.login(toLoginDto(req.body), {
      ip: req.ip,
      userAgent: req.get("user-agent")?.slice(0, 200),
    });

    CookieProvider.setSession(res, sid);
    // Новый CSRF-токен на каждый вход.
    CookieProvider.setCsrf(res, CookieProvider.generateCsrfToken());
    res
      .status(HTTP_STATUS.OK)
      .json({ success: true, user: toPublicUser(user, maskEmail) });
  },

  logout: async (req, res) => {
    await AuthService.logout({ sid: req.cookies?.[COOKIE_NAMES.session] });
    CookieProvider.clearSession(res);
    CookieProvider.clearCsrf(res);
    res.status(HTTP_STATUS.OK).json({ success: true });
  },

  me: (req, res) => {
    res
      .status(HTTP_STATUS.OK)
      .json({ success: true, user: toPublicUser(req.user, maskEmail) });
  },

  forgotPassword: async (req, res) => {
    validateForgotPasswordRequest(req.body);
    const result = await AuthService.forgotPassword(
      toForgotPasswordDto(req.body),
    );
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },

  resendOtp: async (req, res) => {
    validateResendOtpRequest(req.body);
    const result = await AuthService.resendOtp(toResendOtpDto(req.body));
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },

  verifyOtp: async (req, res) => {
    validateVerifyOtpRequest(req.body);
    const result = await AuthService.verifyOtp(toVerifyOtpDto(req.body));
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },

  resetPassword: async (req, res) => {
    validateResetPasswordRequest(req.body);
    await AuthService.resetPassword(toResetPasswordDto(req.body));
    res.status(HTTP_STATUS.OK).json({ success: true });
  },
};
