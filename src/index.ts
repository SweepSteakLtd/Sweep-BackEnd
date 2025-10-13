import * as dotenv from 'dotenv';
dotenv.config();

import openapi from '@wesleytodd/openapi';
import BP from 'body-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { config, env } from './config';
import { routes } from './routes';

if (!env.CURRENT) {
  throw new Error('Environment is NOT available!');
}

const plainApp = express();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'sweepstake API',
      version: '1.0.0',
      description: 'API documentation for the sweepstake application',
    },
  },
};

const oapi = openapi(options);
plainApp.use(oapi);

oapi.securitySchemes('ApiKeyAuth', {
  type: 'apiKey',
  in: 'header',
  name: 'X-Auth-Id',
});

const applyRootConfiguration = (appObject: Express): Express => {
  appObject.use(cors({ origin: true }));
  appObject.use(BP.json()); // Add JSON body parsing
  appObject.use(BP.urlencoded({ extended: false }));

  // Log routes as they're being registered
  routes.forEach(route =>
    route.endpoints.map(endpoint => {
      const fullPath = `/api/${route.apiName}${endpoint.name}`;
      const apiDescription = endpoint.stack.find(item => item.apiDescription)?.apiDescription;
      if (!apiDescription) {
        console.log('[DEBUG] handler missing apiDescription', route.apiName);
      }

      appObject[endpoint.method](fullPath, apiDescription ? oapi.path(apiDescription) : () => {}, endpoint.stack);
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
app.use('/swaggerui', oapi.swaggerui());

console.log('SERVER APP GENERATED');
app.listen(parseInt(process.env.PORT) || 8080, async () => {
  console.log(`APP LISTENING ON PORT ${process.env.PORT || 8080}, environment: ${env.CURRENT}`);
  console.log(`Running on Node.js version: ${config.NODE_JS_VERSION}`);
  console.log('All routes registered and server ready!');
});
