import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const { name, email, phone, city, message, date } = data;

    console.log("New Quote Request:", data);

    const transporter = nodemailer.createTransport({
      host: "smtp-mail.outlook.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"ShadeMaster Website" <${process.env.EMAIL_USER}>`,
      to: process.env.RECEIVER_EMAIL,
      replyTo: email,
      subject: `New ShadeMaster Quote Request - ${name}`,
      text: `Name: ${name}
Email: ${email}
Phone: ${phone}
City: ${city}
Preferred Date: ${date}

Project Details:
${message}`,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("EMAIL ERROR:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to send email" },
      { status: 500 }
    );
  }
}