import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.EMAIL_USER,       
        pass: process.env.EMAIL_PASSWORD,  
    },
});

export const sendEmail = async (to, subject, html) => {
    const mailOptions = {
        from: `"Cutis Support" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${to}`);
    } catch (err) {
       console.error('Email sending failed:', err);
        throw err;
    }
};
