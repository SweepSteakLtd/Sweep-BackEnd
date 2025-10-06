import * as dotenv from 'dotenv';
dotenv.config();

import BP from 'body-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import { config, env } from './config';
import { routes } from './routes';

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

console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌');
console.log('DB Password:', process.env.SUPABASE_DATABASE_PASSWORD ? '✅' : '❌');
console.log('ENV PORT:', process.env.PORT);

app.listen(parseInt(process.env.PORT) || 8080, async () => {
  console.log(`APP LISTENING ON PORT ${process.env.PORT || 8080}, environment: ${env.CURRENT}`);
  console.log(`Running on Node.js version: ${config.NODE_JS_VERSION}`);
  console.log('All routes registered and server ready!');
});
