import Log from "../../models/log.model.js";
import { getCurrentContextData } from "../../utils/contextData.js";

export const saveLogInfo = async (req, message, type, level) => {
   try {
      let context = null;
      if (req) {
         const {
            ip,
            country,
            city,
            os,
            device,
            deviceType,
            browser,
            platform,
         } = getCurrentContextData(req);

         context = `IP: ${ip}, Country: ${country}, City: ${city}, Device Type: ${deviceType}, Browser: ${browser}, Platform: ${platform}, OS: ${os}, Device: ${device}`;
      }

      const log = new Log({
         context,
         message,
         type,
         level,
      });

      await log.save();
   } catch (error) {
      console.error(error);
   }
};
