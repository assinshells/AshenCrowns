import { CharacterService } from "../services/character.service.js";
import { validateUpgradeAttributeRequest } from "../validators/auth.validator.js";
import { toPlayerStats } from "../dto/auth.dto.js";
import { HTTP_STATUS } from "../constants/auth.constants.js";

export const CharacterController = {
  upgradeAttribute: async (req, res) => {
    validateUpgradeAttributeRequest(req.body);
    const updated = await CharacterService.upgradeAttribute(req.user, req.body.attribute);
    res.status(HTTP_STATUS.OK).json({ success: true, stats: toPlayerStats(updated) });
  },
};
