import { createAppApi, createTokenStore } from '@arduino-lab/web';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Namespaced so an admin session in the same browser cannot collide with it. */
export const tokenStore = createTokenStore('arduino-lab.student.refresh');

export const appApi = createAppApi(API_URL, tokenStore);
export const { api, publicApi } = appApi;
export { API_URL };
