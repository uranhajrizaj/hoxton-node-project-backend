import { PrismaClient } from "@prisma/client";
import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
const socket = require("socket.io");

dotenv.config()

const app = express();
const SECRET= process.env.SECRET!

app.use(cors());
app.use(express.json());

const port = 4001;
const prisma = new PrismaClient({ log: ["error", "info", "query", "warn"] });



function getToken (id: number) {
  return jwt.sign({ id: id }, SECRET, {
    expiresIn: '2 minutes'
  })
}
// {select:{friend1Id:true,friend2Id:true}
async function getCurrentUser (token: string) {
  const decodedData = jwt.verify(token, SECRET)
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: decodedData.id },
    include: { following:{select:{friend2:{select:{name:true,surname:true,image:true}}}} }
  })
  return user
}
app.post("/sign-up", async (req, res) => {
  try {
    const findUser = await prisma.user.findUnique({
      where: { email: req.body.email },
    });
    if (findUser) {
      res.status(400).send({ error: "This account already exists" });
    } else {
      const newUser = await prisma.user.create({
        data: {
          name: req.body.name,
          surname: req.body.surname,
          email: req.body.email,
          password: bcrypt.hashSync(req.body.password),
        },
        include:{followedby:true,following:true}
      });
      res.send({user:newUser, token:getToken(newUser.id)});
    }
  } catch (error) {
    //@ts-ignore
    res.send({ error: error.message });
  }
});

app.post("/sign-in", async (req, res) => {
  const findUser = await prisma.user.findUnique({
    where: { email: req.body.email },
    include: { following:{select:{friend2:{select:{name:true,surname:true,image:true}}}} }
  });
  if(findUser&& bcrypt.compareSync(req.body.password,findUser.password)){
    res.send({user:findUser, token:getToken(findUser.id)})
  } else{
    res.status(400).send({error:"Email or password is incorrect"})
  }
});

app.get('/validate', async (req, res) => {
  try {
    if (req.headers.authorization) {
      const user = await getCurrentUser(req.headers.authorization)
      // @ts-ignore
      res.send({ user, token: getToken(user.id) })
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message })
  }
})


const server=app.listen(port, () => {
  console.log(`Serveri is running on: http://localhost:${port}`);
});


const io=socket(server);

//initializing the socket io connection 
io.on("connection", (socket:any) => {
  //for a new user joining the chat
  socket.on("joinChat", async (friendEmail:string,useremail:string) => {
  //user sending a message
  const friend= await prisma.user.findUnique({where:{email:friendEmail}})
  const user =await prisma.user.findUnique({where:{email:useremail}})
  socket.on("chat", (text:any) => {
    //gets the room user and the message sent
    io.to(user).emit("message", {
      userId: user?.id,
      username: user?.email,
      text: text,
    });
  })
})
})

