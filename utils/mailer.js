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
      //  console.log(colors.green(`Email sent to ${to}`));
    } catch (err) {
      // console.error(colors.red('Email sending failed:', err));
        throw err;
    }
};
