import express from 'express';
import { userRouter, } from './src/routes';
import { connectMongoose } from "./src/db/mangoose";
import "dotenv/config";

const app = express();

app.use(express.json());

connectMongoose().catch(err => {
  console.error("Mongo connection failed", err);
  process.exit(1);
});

app.get('/', (req, res) => {
    res.send('TSPark API - Fitness Challenge Platform');
});

app.use('/user', userRouter);

const port = process.env.NODE_PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});