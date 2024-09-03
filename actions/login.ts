"use server";

import * as z from "zod"
import { signIn } from "@/auth";
import {AuthError} from "next-auth";
import { LoginSchema } from "@/schemas";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { generateVerificationToken } from "@/lib/tokens";
import { getUserByEmail } from "@/data/user";
import { sendVerificationEmail , sendTwoFactorTokenEmail} from "@/lib/mail";
import { generateTwoFactorToken } from "@/lib/tokens";
import { getTwoFactorTokenByEmail } from "@/data/two-factor-token";
import { db } from "@/lib/db";
import { getTwoFactorConfirmationByUserId } from "@/data/two-factor-confirmation";
export const login = async (values : z.infer<typeof LoginSchema>) => {
    const validatedFields = LoginSchema.safeParse(values);

    if(!validatedFields.success){
        return {error: "Invalid fields!"};
    }

    const { email, password, code} = validatedFields.data;

    const existingUser = await getUserByEmail( email );

    if(!existingUser || !existingUser.email || !existingUser.password) {
        return {
            error: "Email doesn't exist!"
        }
    }

    if(!existingUser.emailVerified){
        const verificationToken = await generateVerificationToken(existingUser.email)
        return {
            success: "Confirmation email sent"
        }
    };

    const verificationToken = await generateVerificationToken( email );
    
    await sendVerificationEmail(
        verificationToken.email,
        verificationToken.token,
    );

    
    
    if(existingUser?.isTwoFactorEnabled && existingUser?.email) {
        if(code){
            const twoFactorToken = await getTwoFactorTokenByEmail(existingUser.email);

            if(!twoFactorToken){
                return { error: "Invalid Code"};
            }

            if(twoFactorToken.token !== code){
                return { error: "Invalid Code!"}
            }

            const hasExpired = twoFactorToken.expires < new Date();

            if(hasExpired){
                return { error: "Code expired!"};
            }

            await db.twoFactorToken.delete({
                where: { id: twoFactorToken.id}
            })

            const existingConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id);

            if(existingConfirmation){
                await db.twoFactorConfirmation.delete({
                    where: { id: existingConfirmation.id}
                });
            }

            await db.twoFactorConfirmation.create({
                data: {
                    userId: existingUser.id 
                }
            })
            
        }    
        else{
            const twoFactorToken = await generateTwoFactorToken(existingUser.email)
                await sendTwoFactorTokenEmail(
                    twoFactorToken.email,
                    twoFactorToken.token,
                );
                return { twoFactorToken: true}
            }
        }
    
    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: DEFAULT_LOGIN_REDIRECT
        })
        return {success: "Successfully Logged In"};
    }
    catch (error){
        if(error instanceof AuthError){
            switch (error.type){
                case "CredentialsSignin":
                    return { error: "Invalid Credentials!"}
                default:
                    return { error: "Something went wrong!"}
            }
        }
        throw error;
    }
};