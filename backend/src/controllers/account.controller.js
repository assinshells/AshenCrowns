import { AccountService } from "../services/account.service.js";
import {
  toPasswordChangeDto,
  toEmailChangeDto,
} from "../dto/auth.dto.js";
import {
  validatePasswordChangeRequest,
  validateEmailChangeRequest,
  validateConfirmCodeRequest,
  validateAccountResendRequest,
} from "../validators/auth.validator.js";
import { CookieProvider } from "../providers/cookie.provider.js";
import { HTTP_STATUS } from "../constants/auth.constants.js";

export const AccountController = {
  requestPasswordChange: async (req, res) => {
    validatePasswordChangeRequest(req.body);
    const result = await AccountService.requestPasswordChange(
      req.user,
      toPasswordChangeDto(req.body),
    );
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },

  confirmPasswordChange: async (req, res) => {
    validateConfirmCodeRequest(req.body);
    await AccountService.confirmPasswordChange(req.user, {
      code: req.body.code,
    });
    // Все сессии пользователя уже отозваны на сервере — очищаем и cookie.
    CookieProvider.clearSession(res);
    CookieProvider.clearCsrf(res);
    res.status(HTTP_STATUS.OK).json({ success: true });
  },

  requestEmailChange: async (req, res) => {
    validateEmailChangeRequest(req.body);
    const result = await AccountService.requestEmailChange(
      req.user,
      toEmailChangeDto(req.body),
    );
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },

  confirmEmailChange: async (req, res) => {
    validateConfirmCodeRequest(req.body);
    const result = await AccountService.confirmEmailChange(req.user, {
      code: req.body.code,
    });
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },

  resendCode: async (req, res) => {
    validateAccountResendRequest(req.body);
    const result = await AccountService.resendCode(req.user, {
      purpose: req.body.purpose,
    });
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },
};
