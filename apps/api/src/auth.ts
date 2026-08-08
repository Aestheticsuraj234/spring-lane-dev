import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@spring-lane/db";
import { config } from "./config.js";

export const auth = betterAuth({
  appName: "Spring Lane",
  baseURL: config.betterAuthUrl,
  secret: config.authSecret,
  trustedOrigins: [config.webUrl],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    github: {
      clientId: config.github.clientId,
      clientSecret: config.github.clientSecret,
      scope: ["repo"],
      mapProfileToUser: (profile) => ({
        login: profile.login,
      }),
    },
  },
  user: {
    additionalFields: {
      login: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "MEMBER",
        input: false,
        returned: true,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
