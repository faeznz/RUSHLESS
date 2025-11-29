import { MobileConfig } from "../models/mobileConfig.js";

export async function getMobileConfig(_req, res, next) {
  try {
    const config = await MobileConfig.findOne().lean();

    if (!config) {
      return res.status(404).json({
        message: "Mobile configuration not found."
      });
    }

    return res.json({
      link_web: config.link_web,
      pin_app: config.pin_app
    });
  } catch (error) {
    next(error);
  }
}

export async function upsertMobileConfig(req, res, next) {
  try {
    const { link_web, pin_app } = req.body;

    if (!link_web) {
      return res.status(400).json({
        message: "Field link_web wajib diisi."
      });
    }

    const config = await MobileConfig.findOneAndUpdate(
      {},
      { link_web, pin_app },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    ).lean();

    return res.json({
      message: "Konfigurasi berhasil disimpan.",
      link_web: config.link_web,
      pin_app: config.pin_app
    });
  } catch (error) {
    next(error);
  }
}

