import { PrismaClient, User } from "@prisma/client";
import cors from "cors";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Server } from "socket.io";
// const socket = require("socket.io");

dotenv.config();

const app = express();
const SECRET = process.env.SECRET!;

app.use(cors());
app.use(express.json());

const port = 4001;
const prisma = new PrismaClient({ log: ["error", "info", "query", "warn"] });

function getToken(id: number) {
  return jwt.sign({ id: id }, SECRET, {
    expiresIn: "7 days",
  });
}
// {select:{friend1Id:true,friend2Id:true}
async function getCurrentUser(token: string) {
  const decodedData = jwt.verify(token, SECRET);
  const user = await prisma.user.findUnique({
    // @ts-ignore
    where: { id: decodedData.id },
    include: {
      following: {
        select: {
          friend2: { select: { name: true, surname: true, image: true,id:true } },
        },
      },
      followedby: {
        select: {
          friend1: { select: { name: true, surname: true, image: true,id:true } },
        },
      },
    },
  });
  if(!user) return null
  let friends = [
    ...user.following.map((following) => following.friend2),
    ...user.followedby.map((followedby) => followedby.friend1),
  ];
  return {...user,friends};
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
        include: { followedby: true, following: true },
      });
      res.send({ user: newUser, token: getToken(newUser.id) });
    }
  } catch (error) {
    //@ts-ignore
    res.send({ error: error.message });
  }
});

app.post("/sign-in", async (req, res) => {
  const findUser = await prisma.user.findUnique({
    where: { email: req.body.email },
    include: {
      following: {
        select: {
          friend2: { select: { name: true, surname: true, image: true,id:true } },
        },
      },
      followedby: {
        select: {
          friend1: { select: { name: true, surname: true, image: true,id:true } },
        }, 
      },
    

    },
  });
  if (findUser && bcrypt.compareSync(req.body.password, findUser.password)) {
    let friends = [
      ...findUser.following.map((following) => following.friend2),
      ...findUser.followedby.map((followedby) => followedby.friend1),
    ];

    res.send({ user: {...findUser,friends}, token: getToken(findUser.id) });
  } else {
    res.status(400).send({ error: "Email or password is incorrect" });
  }
});


app.post("/friendship",async(req,res)=>{
   const friend1Id=Number(req.body.friend1Id)
   const friend2Id=Number(req.body.friend2Id)
  // const relation= await prisma.friendship.findUnique({where:{room:friend1Id},include:{friend1:true,friend2:true}})
  const relation= await prisma.friendship.findUnique({where:{friend1Id_friend2Id:{friend1Id,friend2Id}},include:{friend1:true,friend2:true}})
  // const relation= await prisma.friendship.findUnique({where:{}}})
  
   if(relation) res.send(relation)
   else res.send({})

   
})
 
app.get("/validate", async (req, res) => {
  try {
    if (req.headers.authorization) {
      const user = await getCurrentUser(req.headers.authorization);
      // @ts-ignore
      res.send({ user, token: getToken(user.id) });
    }
  } catch (error) {
    // @ts-ignore
    res.status(400).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Serveri is running on: http://localhost:${port}`);
});

const io = new Server(4555, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const messages: Message[] = [];

type Message={
 content:string,
 user:User & {friends: User[]}
}


//initializing the socket io connection
io.on("connection", (socket) => {
  //for a new user joining the chat
  // const friend=await prisma.user.findUnique({where:{email:"ergi@email.com"}})
  socket.emit("message",messages)
  socket.on("message", (message: Message) => {
    messages.push(message);
    socket.broadcast.emit("message", messages);
  });
});
