import { WorkService } from "../services/work.service.js";
import { validateStartWorkRequest } from "../validators/auth.validator.js";
import { HTTP_STATUS } from "../constants/auth.constants.js";

export const WorkController = {
  state: async (req, res) => {
    res.status(HTTP_STATUS.OK).json({ success: true, ...(await WorkService.getState(req.user)) });
  },

  start: async (req, res) => {
    validateStartWorkRequest(req.body);
    const { kind, hours } = req.body;
    const result = await WorkService.start(req.user, { kind, hours });
    res.status(HTTP_STATUS.OK).json({ success: true, ...result });
  },

  cancel: async (req, res) => {
    const cancelled = await WorkService.cancel(req.user);
    res.status(HTTP_STATUS.OK).json({ success: true, cancelled });
  },
};
