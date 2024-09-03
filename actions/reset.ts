"use server"

import * as z from "zod";

import { ResetSchema } from "@/schemas";
import { getUserByEmail } from "@/data/user";
import { sendPasswordResetEmail } from "@/lib/mail";
import { generatePasswordResetToken } from "@/lib/tokens";

export const reset = async ( values: z.infer<typeof ResetSchema>) => {
    const validatedFields = ResetSchema.safeParse(values);
    console.log("here");
    if(!validatedFields.success){
        return { error: "Invalid Email!"};
    }
    console.log("here");
    const { email} = validatedFields.data;
    console.log("here");
    const existingUser = await getUserByEmail(email);
    console.log("here");
    if(!existingUser){
        return { error: "Email not found"}
    }
    console.log("here");
    const passwordResetToken = await generatePasswordResetToken(email);
    console.log(passwordResetToken)
    await sendPasswordResetEmail(
        passwordResetToken.email,
        passwordResetToken.token
    )

    return { success: "Reset Email sent!"}

}