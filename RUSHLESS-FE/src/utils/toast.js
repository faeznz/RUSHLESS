import { toast as baseToast } from "react-toastify";

export const toast = {
  success: (msg, opt = {}) =>
    baseToast.success(msg, { position: "top-right", autoClose: 3000, ...opt }),

  error: (msg, opt = {}) =>
    baseToast.error(msg, { position: "top-right", autoClose: 3000, ...opt }),

  info: (msg, opt = {}) =>
    baseToast.info(msg, { position: "top-right", autoClose: 3000, ...opt }),

  warn: (msg, opt = {}) =>
    baseToast.warn(msg, { position: "top-right", autoClose: 3000, ...opt }),
};
