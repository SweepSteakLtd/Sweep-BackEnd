import * as dotenv from 'dotenv';
dotenv.config();

import openapi from '@wesleytodd/openapi';
import BP from 'body-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { version } from '../package.json';
import { config, env } from './config';
import { AuthenticateAdminMiddleware } from './middlewares';
import { routes } from './routes';
import { clearConfigCache, initializeRemoteConfig } from './services/remoteConfig';

if (!env.CURRENT) {
  throw new Error('Environment is NOT available!');
}

const plainApp = express();

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'sweepstake API',
      version: version,
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
      // TODO: openapi requires paths to be in {} format -> library has problems handling :id format in express 5
      const fullPath = `/api/${route.apiName}${endpoint.name}`;
      const apiDescription = endpoint.stack.find(item => item.apiDescription)?.apiDescription;
      if (!apiDescription) {
        console.log('[DEBUG] handler missing apiDescription', route.apiName);
      }

      appObject[endpoint.method](
        fullPath,
        apiDescription ? oapi.path(apiDescription) : () => {},
        endpoint.stack,
      );
      console.log(
        `ENV: ${env.CURRENT} PORT: 8080 ROUTE: ${fullPath} METHOD: ${endpoint.method.toUpperCase()}`,
      );
    }),
  );

  appObject.get(`/`, (req: Request, res: Response) => {
    res.send(
      `API ROOT: ENV: ${env.CURRENT} + NodeJS: ${config.NODE_JS_VERSION} + API Version: ${version}`,
    );
  });
  console.log(`ENV: ${env.CURRENT} PORT: 8080 ROUTE: / METHOD: GET`);

  appObject.get(`/version`, (req: Request, res: Response) => {
    res.json({
      version: version,
      environment: env.CURRENT,
      nodeVersion: config.NODE_JS_VERSION,
    });
  });
  console.log(`ENV: ${env.CURRENT} PORT: 8080 ROUTE: /version METHOD: GET`);

  appObject.post(
    `/admin/refresh-remote-config`,
    AuthenticateAdminMiddleware,
    async (_req: Request, res: Response) => {
      try {
        clearConfigCache();
        console.log('[Admin] Remote Config cache cleared by admin:', res.locals.user.email);
        res.json({
          success: true,
          message: 'Remote Config cache cleared successfully. Next access will fetch fresh values.',
          clearedBy: res.locals.user.email,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('[Admin] Error clearing Remote Config cache:', error.message);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to clear Remote Config cache',
        });
      }
    },
  );
  console.log(`ENV: ${env.CURRENT} PORT: 8080 ROUTE: /admin/refresh-remote-config METHOD: POST`);

  return appObject;
};

export const app = applyRootConfiguration(plainApp);
app.use('/swaggerui', oapi.swaggerui());

app.use('/ip', async (req, res, next) => {
  const response = fetch('https://ifconfig.me/ip').then(r => r.text());
  console.log('Outbound IP:', response);
  res.send(response);
});

console.log('SERVER APP GENERATED');
app.listen(parseInt(process.env.PORT) || 8080, async () => {
  console.log(`APP LISTENING ON PORT ${process.env.PORT || 8080}, environment: ${env.CURRENT}`);
  console.log(`API Version: ${version}`);
  console.log(`Running on Node.js version: ${config.NODE_JS_VERSION}`);

  // Initialize Firebase Remote Config
  await initializeRemoteConfig();

  console.log('All routes registered and server ready!');
});
