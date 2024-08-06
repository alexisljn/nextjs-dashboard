import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { Client } from 'pg';
import { User } from './app/lib/definitions';
import bcrypt from 'bcrypt';

async function connectToDatabase() {
    const client = new Client({
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        host: process.env.POSTGRES_HOST,
        port: 5432,
        database: process.env.POSTGRES_DATABASE
    })

    await client.connect()

    return client;
}

async function getUser(email: string): Promise<User | undefined> {
    let client: Client | undefined;
    try {
        client = await connectToDatabase();

        const user = await client.query(`SELECT * FROM users WHERE email=$1`, [email]);
        
        return user.rows[0];
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    } finally {
        if (client) {
            await client.end();
        }
    }
}

// Here we create a new nextAuth 
export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [Credentials({
        async authorize(credentials) {
            const parsedCredentials = z
                .object({ email: z.string().email(), password: z.string().min(6) })
                .safeParse(credentials);

            if (parsedCredentials.success) {
              const { email, password } = parsedCredentials.data;
              
              const user = await getUser(email);
              
              if (!user) return null;
              
              const passwordsMatch = await bcrypt.compare(password, user.password);

              if (passwordsMatch) return user;
            }
            console.log('Invalid credentials');
            
            return null;
        }
    })]
});