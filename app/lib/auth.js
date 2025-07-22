import clientPromise from "./mongoDB";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const saltRounds = 10;

export async function register(birthdate, email, userName, password) {
  const client = await clientPromise
  const db = client.db("Chat-With-Us")

  const exists = await db.collection("users").findOne({ userName })

  if (exists) {
    return { success: false, message: "User există" }
  }

  const hash = await bcrypt.hash(password, saltRounds)
  await db.collection("users").insertOne({ birthdate, email, userName, password: hash })

}

export async function authLogin(userName,password){
    const client = await clientPromise
    const db = client.db("Chat-With-Us")

    const user = await  db.collection("users").findOne({userName})
    
    if(!user){
        return {success:false,message:"user nu exista"}
    }

    const ok = await bcrypt.compare(password, user.password)

    if(!ok){
        return {success:false,message:"parola e gresita"}
    }
    
    return {success:true,message:"tot ok",user:user}
}

export async function authLoginGoogle(id_token) {
  if (!id_token) {
    return { success: false, message: "Nu există id_token" };
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const clientDb = await clientPromise;
    const db = clientDb.db("Chat-With-Us");

    let user = await db.collection("users").findOne({ email: payload.email });

    if (!user) {
      const newUser = {
        userName: payload.name,
        email: payload.email,
        googleId: payload.sub,
        birthdate: null,
        password: null,
        role: "user",
      };
      const result = await db.collection("users").insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    }

    const tokenObj = await createToken(user);

    if (!tokenObj.success) {
      return { success: false, message: tokenObj.message };
    }

    return { success: true, token: tokenObj.token, user };

  } catch (error) {
    console.error("Google token invalid:", error);
    return { success: false, message: "Token Google invalid" };
  }
}

export async function createToken(user) {

    const payload = { userId: user._id, userName: user.userName ,role:user.role};
    const secret= process.env.JWT_SECRET
    const options = {expiresIn:"7d"}

    if(!secret){
        return {success:false,message:"nu exista secretul JWT"}
    }

    const token = jwt.sign(payload, secret, options)
    
    return {success:true,message:"totul a mers bine ",token:token,user:user}
}

export async function createMessage(user,text,chatId) {
    const client = await clientPromise
    const db = client.db("Chat-With-Us")
    const createdAt = new Date()
    try{
        await db.collection("mesaje").insertOne({ chatId,  userName: user.userName,text,createdAt})
        return {success:true,message:"totul a mers bine ",data:{
            chatId,
            userId: user._id,
            user,
            text,
            createdAt
        }}
    }catch(err){
        return {success:false,message:"nu a mers prea bine ",user:user}
    }
}

export async function createChat(user,chatName) {
    const client = await clientPromise
    const db = client.db("Chat-With-Us")
    try{
        const result = await db.collection("Chats").insertOne({userId: [user._id],chatName,createdAt: new Date()})
        return {success:true,message:"chatul a fost creat",data:{
            _id:result.insertedId,
            chatName,
            createdAt: new Date()

        }}
    }catch(err){
        console.log("error : ",err)
        return {success:false,message:"ceva nu a mers bine"}
    }
    
}