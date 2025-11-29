import express from 'express';
import userRouter from './src/routes/userRouter';
import gymRouter from './src/routes/gymRouter';
import { connectMongoose, closeMongoose } from "./src/db/mangoose";
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
app.use('/gym', gymRouter);

app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
});