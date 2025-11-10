import express from 'express';
import connectMongo from './src/mongoClient';

const app = express();

(async () => {
    const db = await connectMongo();
    const dbs = await db.admin().listDatabases();
    console.log('Databases:', dbs.databases.map((d: { name: string }) => d.name));
})();

app.get('/', (req, res) => {
    res.send('shany fox man!');
});


app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
});