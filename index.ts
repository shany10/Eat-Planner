import express from 'express';
import { userRouter, gymRouter, badgeRouter, challengeRouter, exerciseTypeRouter, trainingStatRouter, userBadgeRouter, socialChallengeRouter, scoreRouter } from './src/routes';
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
app.use('/gym', gymRouter);
app.use('/badge', badgeRouter);
app.use('/challenge', challengeRouter);
app.use('/exerciseType', exerciseTypeRouter);
app.use('/trainingStat', trainingStatRouter);
app.use('/userBadge', userBadgeRouter);
app.use('/socialChallenge', socialChallengeRouter);
app.use('/score', scoreRouter);

app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
});