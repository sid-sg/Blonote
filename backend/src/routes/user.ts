import { Hono } from 'hono'
import { createHash, validatePassword } from '../util/passwordHashing';
import { sign } from 'hono/jwt'
import jwtAuth from '../controllers/jwtAuth';

import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate'
import { signupSchema, loginSchema } from '@sid-sg/blonote-common/dist/zodSchema/userSchema';

type envType = {
  Bindings: {
    DATABASE_URL: string,
    JWT_SECRET: string
  }
}

const userRouter = new Hono<envType>();

userRouter
  .post('/signup', async(c)=>{

    const body = await c.req.json();
  
    try{
      signupSchema.parse(body);
    }
    catch(e){
      c.status(400);
      return c.json({message: e});
    }

    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const foundUser = await prisma.user.findUnique({
      where: {
        email: body.email
      }
    });
    if(foundUser){
     c.status(409);
		  return c.json({ message: "user already exists"});
    }

    const hashedPassword:string = await createHash(body.plainPassword);
    try{
      const createdUser = await prisma.user.create({
        data: {
          email: body.email,
          name: body.name,
          hashedPassword: hashedPassword
        }
      });
      const token = await sign({id: createdUser.id}, c.env.JWT_SECRET);
      return c.json({token: token});
    }
    catch(e){
      console.log(e);
      c.status(403);
      return c.json({message: "Something wrong happened"})
      
    }
  })

  .post('/login', async(c)=>{
    

    const body = await c.req.json();

    try{
      loginSchema.parse(body);
    }
    catch(e){
      c.status(400);
      return c.json({message: e});
    }

    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());

    const foundUser = await prisma.user.findFirst({
      where: {
        email: body.email
      }
    });

    if(!foundUser){
     c.status(404);
		  return c.json({ message: "user not found"});
    }

    const samePassword = await validatePassword(foundUser.hashedPassword, body.plainPassword);

    if(!samePassword){
      c.status(401);
		  return c.json({ message: "wrong password"});
    }

    const token = await sign({id: foundUser.id}, c.env.JWT_SECRET);
    return c.json({token: token});    
    
  })
  .post('/validate',jwtAuth ,async(c)=>{
    console.log("successfully validated");
    
    return c.json({ message: "validated"});
  })

export default userRouter;
