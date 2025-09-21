import * as dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import BP from 'body-parser';
import { routes } from './routes';
import { env, config } from './config';

if (!env.CURRENT) {
  throw new Error('Environment is NOT available!');
}

const plainApp = express();

const applyRootConfiguration = (appObject: Express): Express => {
  appObject.use(cors({ origin: true }));
  appObject.use(BP.json()); // Add JSON body parsing
  appObject.use(BP.urlencoded({ extended: false }));

  // Log routes as they're being registered
  routes.forEach(route =>
    route.endpoints.map(endpoint => {
      const fullPath = `/api/${route.apiName}${endpoint.name}`;
      appObject[endpoint.method](fullPath, endpoint.stack);
      console.log(`ENV: ${env.CURRENT} PORT: 8080 ROUTE: ${fullPath} METHOD: ${endpoint.method.toUpperCase()}`);
    }),
  );

  appObject.get(`/`, (req: Request, res: Response) => {
    res.send(`API ROOT: ENV: ${env.CURRENT} + NodeJS: ${config.NODE_JS_VERSION}`);
  });
  console.log(`ENV: ${env.CURRENT} PORT: 8080 ROUTE: / METHOD: GET`);

  return appObject;
};

export const app = applyRootConfiguration(plainApp);
console.log('SERVER APP GENERATED');

app.listen(8080, async () => {
  console.log(`APP LISTENING ON PORT 8080, environment: ${env.CURRENT}`);
  console.log(`Running on Node.js version: ${config.NODE_JS_VERSION}`);
  console.log('All routes registered and server ready!');
});
