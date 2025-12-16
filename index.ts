import express from 'express';
import { 
    userRouter, 
    gymRouter, 
    badgeRouter, 
    badgeRuleRouter, 
    exerciseTypeRouter, 
    challengeRouter,
    scoreRouter
} from './src/routes';
import { connectMongoose } from "./src/db/mangoose";
import "dotenv/config";

const app = express();
app.use(express.json());

if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not defined in environment variables.");
    process.exit(1);
}

connectMongoose().catch(err => {
  console.error("Mongo connection failed", err);
  process.exit(1);
});

app.get('/', (req, res) => {
    res.send('TSPark API - Fitness Challenge Platform');
});

app.use('/user', userRouter);
app.use('/gym', gymRouter);
app.use('/badge', badgeRouter);
app.use('/badgeRule', badgeRuleRouter);
app.use('/exerciseType', exerciseTypeRouter);
app.use('/challenge', challengeRouter);
app.use('/score', scoreRouter);

app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
});