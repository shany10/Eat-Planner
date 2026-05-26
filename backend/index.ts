import express from 'express';
import {
  userRouter,
  supplierRouter,
  ingredientRouter,
  dishRouter,
  chargeRouter,
  saleRouter,
  forecastRouter,
  purchaseOrderRouter
} from './src/routes';
import { connectMongoose } from "./src/db/mangoose";
import { ensureUserAccessBootstrap } from "./src/services/userAccessBootstrap";
import "dotenv/config";

const app = express();

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

const port = process.env.NODE_PORT || 3000;

async function startServer() {
  try {
    await connectMongoose();

    const bootstrap = await ensureUserAccessBootstrap();
    if (bootstrap.createdAdminEmail) {
      console.log(`Bootstrap admin created: ${bootstrap.createdAdminEmail}`);
    }
    if (bootstrap.normalizedLegacyUsers > 0) {
      console.log(`Legacy users migrated to manager: ${bootstrap.normalizedLegacyUsers}`);
    }
    if (bootstrap.demotedExtraAdmins > 0) {
      console.log(`Extra admin accounts demoted to manager: ${bootstrap.demotedExtraAdmins}`);
    }

    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Server startup failed", err);
    process.exit(1);
  }
}

void startServer();
