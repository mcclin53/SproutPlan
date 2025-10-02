import jwt, { JwtPayload }  from 'jsonwebtoken';

import { GraphQLError } from 'graphql';
import dotenv from 'dotenv';
dotenv.config();
// const SECRET = process.env.JWT_SECRET_KEY || 'supersecretkey';
const getSecret = (): string => process.env.JWT_SECRET_KEY || "supersecretkey";

const expiration = '2h';

// Middleware to authenticate token
// verifies existing token and decodes user data
export const authenticateToken = ({ req }: any) => {
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer ')) {
    // Remove 'Bearer ' prefix from token
    token = token.split(' ').pop().trim();
    console.log("Token:", token);
    console.log("Secret Key:", process.env.JWT_SECRET_KEY)
  }
  if (!token) {
    return req;
  }

  try {
    const { data } = jwt.verify(token, getSecret(), { maxAge: expiration }) as JwtPayload & { data: UserPayload };
    req.user = data;
  } catch (err) {
    console.log("Invalid token:", err instanceof Error ? err.message : err);
  }
  return req; // return the request object with user data
};

// create a custom error class for user already exists errors
export class UserExistsError extends GraphQLError {
  constructor(message: string = 'User already exists with this email address') {
    super(message, {
      extensions: {
        code: 'USER_EXISTS'
      }
    });
    Object.defineProperty(this, 'name', { value: 'UserExistsError' });
  }
}

export interface UserPayload {
  _id: string;
  email: string;
  username: string;
}
export interface AuthRequest {
  user?: UserPayload;
}

// create a JSON Web Token (JWT) for user authentication
// the token will be signed with the secret key and will expire in 2 hours
export function signToken(user: UserPayload): string {
  return jwt.sign({ data: user }, getSecret(), { expiresIn: expiration });
}

// create a custom error class for authentication errors
// calls the GraphQLError constructor with the message 
// and sets the error code to 'UNAUTHENTICATED'
export class AuthenticationError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: {
        code: 'UNAUTHENTICATED'
      }
    });
    Object.defineProperty(this, 'name', { value: 'AuthenticationError' });
  }
};