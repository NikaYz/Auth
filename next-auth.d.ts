import { UserRole } from "@prisma/client";
import NextAuth , { DefaultSession } from "react-icons";

export type ExtendedUser = DefaultSession["user"] & {
    role: UserRole;
    isTwoFactorEnabled: boolean;
    isOAuth: boolean
};

declare module "next-auth" {
    interface Session {
        user: ExtendedUser;
    }
}