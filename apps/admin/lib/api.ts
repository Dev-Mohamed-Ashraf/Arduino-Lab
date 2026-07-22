import { createAppApi, createTokenStore } from '@arduino-lab/web';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Namespaced so a student session in the same browser cannot collide with it. */
export const tokenStore = createTokenStore('arduino-lab.admin.refresh');

export const appApi = createAppApi(API_URL, tokenStore);
export const { api } = appApi;

/** CSV exports are plain navigations, so the URL has to be absolute. */
export function exportUrl(path: string): string {
  return `${API_URL}${path}`;
}

export { API_URL };
