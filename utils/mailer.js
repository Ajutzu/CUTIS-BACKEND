import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., 'gmail', 'outlook', 'yahoo'
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password for Gmail
  },
});

export const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}:`, info.messageId);
    return info;
  } catch (err) {
    console.error('Email sending failed:', err);
    throw err;
  }
};
