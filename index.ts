import express from 'express';
import userRout from './src/routes/userRout';

const app = express();
app.use(express.json());

userRout(app);


app.get('/', (req, res) => {
    res.send('shany fox man!');
});


app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
});