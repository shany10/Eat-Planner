import e from "express";
import { connectMongoose, closeMongoose } from "../db/mangoose";
import { User } from "../models/user";

export default function userRout(app: e.Express) {

    app.get('/user/getAll', async (req, res): Promise<void> => {
        await connectMongoose();
        const list =  await User.find().exec();
        await closeMongoose();
        res.json(list);
    })

    app.post('/user/create', async (req, res): Promise<void> => {
        const body = req.body;
        await connectMongoose();
        const created = await User.create({
            firstname: body.firstname,
            lastname: body.lastname,
            statu: body.statu,
            active: body.active,
        });
        await closeMongoose();
       const message = created && typeof created === "object" ? "user created" : "error";
        res.send(message).status(201);
    })

    app.delete('/user/delete/:id', async (req, res): Promise<void> => {
        const { id } = req.params;
        await connectMongoose();
        const deleted = await User.findByIdAndDelete(id).exec();
        // await User.deleteMany({})
        await closeMongoose();
        res.send("user deleted").status(204);
    })
}