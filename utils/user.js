import User from '../models/user.js';
import bcrypt from 'bcryptjs';

export const handlePasswordChange = async (user, currentPassword, newPassword) => {
    if (!currentPassword) {
        throw { status: 400, message: 'Current password is required to set a new one.' };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw { status: 401, message: 'Current password is incorrect.' };
    }

    if (newPassword.length < 8) {
        throw { status: 400, message: 'New password must be at least 8 characters long.' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
};

export const handleEmailChange = async (user, email) => {
    if (email && email !== user.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw { status: 409, message: 'Email is already in use by another account.' };
        }
        user.email = email;
    }
};