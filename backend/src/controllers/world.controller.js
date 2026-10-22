import { WorldService } from "../services/world.service.js";
import { parseCityId } from "../validators/auth.validator.js";
import { HTTP_STATUS } from "../constants/auth.constants.js";

export const WorldController = {
  map: async (req, res) => {
    res.status(HTTP_STATUS.OK).json({ success: true, ...(await WorldService.getMap(req.user)) });
  },

  city: async (req, res) => {
    const cityId = parseCityId(req.params.id);
    res.status(HTTP_STATUS.OK).json({ success: true, ...(await WorldService.getCity(req.user, cityId)) });
  },
};
