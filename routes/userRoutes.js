const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const router = express.Router();


// Multer Configuration for Avatar Uploads
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
    limits: { fileSize: 1024 * 1024 * 2 }, // 2MB file size limit
});

// Generate JWT Token
const generateToken = (id, expiresIn = '1h') => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn });
};

// Signup
// signup route
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        // We do NOT hash here, we let the schema hook do it
        const newUser = new User({ email, password });
        await newUser.save();

        res.status(201).json({ success: true, userId: newUser._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Signup failed' });
    }
});


// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body; // plain text from client
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Compare plain text password with stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // If you use JWT:
        const token = generateToken(user._id);
        res.json({ token, user: { id: user._id, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Login failed' });
    }
});


// Update Profile
router.put('/profile', upload.single('avatar'), async (req, res) => {
    try {
        const { name } = req.body;
        const avatar = req.file ? req.file.path : null; 

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { name, ...(avatar && { picture: avatar }) },
            { new: true } 
        );

        res.status(200).json({
            message: 'Profile updated successfully.',
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                picture: updatedUser.picture,
            },
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

// Password Reset Request
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate reset token
        const token = generateToken(user._id, '15m');

        // Placeholder for sending the token via email (e.g., Nodemailer)
        // Example:
        // await sendEmail(email, 'Password Reset Request', `Your reset token is: ${token}`);

        res.status(200).json({ message: 'Password reset email sent', token });
    } catch (err) {
        res.status(500).json({ message: `Failed to process password reset: ${err.message}` });
    }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        // Verify reset token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

        res.status(200).json({ message: 'Password reset successful' });
    } catch (err) {
        res.status(400).json({ message: `Failed to reset password: ${err.message}` });
    }
});

module.exports = router;
