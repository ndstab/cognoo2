import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { NextAuthOptions } from "next-auth"
import connectDB from '@/config/db'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })
          
          const data = await response.json()
          
          if (response.ok && data.user) {
            return {
              id: data.user._id,
              email: data.user.email,
              name: data.user.username,
            }
          }
          
          return null
        } catch (error) {
          console.error("Credentials Auth error:", error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email || !profile?.name) {
          console.error("Google profile missing email or name");
          return false;
        }

        try {
          await connectDB();
          
          let existingUser = await User.findOne({ email: profile.email });

          if (!existingUser) {
            console.log(`Creating new Google user: ${profile.email}`);
            existingUser = await User.create({
              email: profile.email,
              username: profile.name,
              provider: "google",
            });
          } else if (existingUser.provider !== 'google') {
             console.warn(`User ${profile.email} exists with provider ${existingUser.provider}, logging in via Google.`);
          }

          user.id = existingUser._id.toString();
          user.name = existingUser.username;
          user.email = existingUser.email;

          return true;
        } catch (error) {
          console.error("Error during Google sign-in DB interaction:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
} 