import express from 'express';
import userRout from './src/routes/userRout';
import { connectMongoose, closeMongoose } from "./src/db/mangoose";

const app = express();
app.use(express.json());

connectMongoose().catch(err => {
  console.error("Mongo connection failed", err);
  process.exit(1);
});

app.get('/', (req, res) => {
    res.send('shany fox man!');
});

app.use('/user', userRout);


app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
});