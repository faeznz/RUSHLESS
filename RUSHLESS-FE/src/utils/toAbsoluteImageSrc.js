import api from '../api/axiosInstance';

export function toAbsoluteImageSrc(html) {
  return html.replace(/src="\/uploads/g, `src="${api.defaults.baseURL}/uploads`);
}