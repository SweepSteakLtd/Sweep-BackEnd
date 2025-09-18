import type { RequestHandler } from 'express';
import { playgroundHandler } from '../handlers';

interface RouteEndpoint {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  name: string;
  stack: RequestHandler[];
}

interface RouteDescription {
  apiName: string;
  endpoints: RouteEndpoint[];
}

export const routes: RouteDescription[] = [
  {
    apiName: 'playground',
    endpoints: [
      {
        method: 'get',
        name: '/',
        stack: [playgroundHandler],
      },
    ],
  },
];
