import './instrument';
import * as Sentry from '@sentry/node';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import {
  userRouter,
  supplierRouter,
  ingredientRouter,
  dishRouter,
  chargeRouter,
  saleRouter,
  forecastRouter,
  purchaseOrderRouter,
  paymentCardRouter,
  debugRouter
} from './src/routes';
import { connectMongoose } from "./src/db/mangoose";
import { attachVideoSignaling } from "./src/realtime/videoSignaling";
import { ensureUserAccessBootstrap } from "./src/services/userAccessBootstrap";
import "dotenv/config";

const app = express();
const httpServer = createServer(app);

// En prod l'app tourne derriere un reverse proxy (TLS). Sans ceci, req.ip vaut
// l'IP du proxy et le rate-limit s'appliquerait globalement au lieu de par
// client. "1" = un seul proxy de confiance en amont.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Headers de sécurité HTTP (API JSON) : X-Content-Type-Options, HSTS, etc.
app.use(helmet());
app.use(express.json());

app.get('/', (req, res) => {    
    res.send('eat planner');
});

app.use('/user', userRouter);
app.use('/suppliers', supplierRouter);
app.use('/ingredients', ingredientRouter);
app.use('/dishes', dishRouter);
app.use('/charges', chargeRouter);
app.use('/sales', saleRouter);
app.use('/forecasts', forecastRouter);
app.use('/purchase-orders', purchaseOrderRouter);
app.use('/payment-cards', paymentCardRouter);
app.use('/debug', debugRouter);

// Must be registered after all routes so Sentry can capture errors thrown in
// route handlers and forward them to GlitchTip.
Sentry.setupExpressErrorHandler(app);

const port = process.env.NODE_PORT || 3000;

async function startServer() {
  try {
    await connectMongoose();

    const bootstrap = await ensureUserAccessBootstrap();
    if (bootstrap.createdAdminEmail) {
      console.log(`Bootstrap admin created: ${bootstrap.createdAdminEmail}`);
    }
    if (bootstrap.createdSupplierEmail) {
      console.log(`Bootstrap supplier portal created: ${bootstrap.createdSupplierEmail}`);
    }
    if (bootstrap.normalizedLegacyUsers > 0) {
      console.log(`Legacy users migrated to manager: ${bootstrap.normalizedLegacyUsers}`);
    }
    if (bootstrap.demotedExtraAdmins > 0) {
      console.log(`Extra admin accounts demoted to manager: ${bootstrap.demotedExtraAdmins}`);
    }

    attachVideoSignaling(httpServer);

    httpServer.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Server startup failed", err);
    process.exit(1);
  }
}

void startServer();
