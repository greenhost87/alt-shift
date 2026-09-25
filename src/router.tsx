import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { BASE_PATH } from './system/config/environment';

export function getRouter() {
  return createRouter({
    basepath: BASE_PATH || '/',
    routeTree,
    scrollRestoration: true,
  });
}
