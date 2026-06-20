// lib/auth.ts
// NextAuth v5 configuration — CredentialsProvider with single admin password

import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Admin",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const adminPassword = process.env.ADMIN_PASSWORD
        if (!adminPassword) {
          throw new Error("ADMIN_PASSWORD environment variable is not set")
        }

        if (credentials?.password === adminPassword) {
          return {
            id: "admin",
            name: "Admin",
            email: "admin@sgentertainment.com.gh",
            role: "admin",
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
})
