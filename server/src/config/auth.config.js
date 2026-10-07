import NextAuth from 'next-auth';
import dns from 'node:dns';

// Fix for Node 18+ IPv6 ECONNRESET issue with Google OAuth
dns.setDefaultResultOrder('ipv4first');

import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  loginWithCredentials,
  autoLoginAfterVerification,
  handleOAuthSignIn,
} from '../services/auth.service.js';
import { findUserByEmail, findUserByProviderId, findUserById } from '../models/user.model.js';

// ─── Providers ────────────────────────────────────────────────────────────────

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      httpOptions: {
        timeout: 15000,
      },
    })
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      httpOptions: {
        timeout: 15000,
      },
    })
  );
}

providers.push(
  CredentialsProvider({
    name: 'Credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
      autoLoginToken: { label: 'Auto Login Token', type: 'text' },
    },
    async authorize(credentials) {
      // 1. Luồng Auto-login sau khi xác thực email
      if (credentials.autoLoginToken) {
        try {
          return await autoLoginAfterVerification(credentials.autoLoginToken);
        } catch {
          return null;
        }
      }

      // 2. Luồng đăng nhập Email + Password bình thường
      if (!credentials.email || !credentials.password) {
        throw new Error('Vui lòng nhập đầy đủ email và mật khẩu.');
      }

      const { user } = await loginWithCredentials(credentials.email, credentials.password);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.avatar,
      };
    },
  })
);

// ─── Auth Options ─────────────────────────────────────────────────────────────

export const authOptions = {
  providers,
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === 'credentials') {
        return true;
      }

      try {
        await handleOAuthSignIn({
          email: user.email?.toLowerCase() || null,
          name: user.name || 'Người dùng',
          provider: account.provider,
          providerId: account.providerAccountId,
          avatar: user.image,
        });
        return true;
      } catch (err) {
        console.error('[NextAuth signIn]', err);
        if (err.message && err.message.includes('liên kết với tài khoản')) {
          return `/auth/login?error=OAuthAccountLinked&message=${encodeURIComponent(err.message)}`;
        }
        return false;
      }
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role || 'student';

        // Cập nhật token.id cho OAuth vì provider không trả sẵn DB ID
        if (account?.provider !== 'credentials') {
          let dbUser = null;
          if (user.email) {
            dbUser = await findUserByEmail(user.email);
          }
          // Nếu không tìm được qua email (Facebook không có email), tìm theo provider_id
          if (!dbUser && account?.providerAccountId) {
            dbUser = await findUserByProviderId(account.provider, account.providerAccountId);
          }
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        }
      }
      if (token.id) {
        const dbUser = await findUserById(token.id);
        if (dbUser?.role) token.role = dbUser.role;
        const revokedAt = dbUser?.sessions_revoked_at ? new Date(dbUser.sessions_revoked_at).getTime() : 0;
        if (revokedAt && (Number(token.iat || 0) * 1000 + 999) < revokedAt) token.sessionRevoked = true;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.sessionRevoked) {
        session.user = null;
        session.error = 'SessionRevoked';
      } else if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
};
