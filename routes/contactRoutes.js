const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { Parser } = require('json2csv');

const Contact = require('../models/Contact');
const { verifyToken } = require('../middleware/authMiddleware');

// Get Contacts with Pagination and Sorting
router.get('/', verifyToken, async (req, res) => {
    const { id: userId } = req.user; // Extract userId from verified token
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc', search = '' } = req.query;

    try {
        // Build search query
        const query = {
            userId,
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ],
        };

        // Fetch paginated and sorted contacts
        const contacts = await Contact.find(query)
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Contact.countDocuments(query);

        res.status(200).json({ contacts, total, page, limit });
    } catch (err) {
        res.status(500).json({ message: `Failed to fetch contacts: ${err.message}` });
    }
});

// Add Contact
router.post('/', verifyToken, async (req, res) => {
    const contactData = { ...req.body, userId: req.user.id };

    try {
        const contact = await Contact.create(contactData);
        res.status(201).json(contact);
    } catch (err) {
        res.status(500).json({ message: `Failed to add contact: ${err.message}` });
    }
});

// Update Contact
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const contact = await Contact.findOneAndUpdate(
            { _id: id, userId: req.user.id }, // Ensure the user owns the contact
            updates,
            { new: true }
        );
        if (!contact) return res.status(404).json({ message: 'Contact not found' });
        res.status(200).json(contact);
    } catch (err) {
        res.status(500).json({ message: `Failed to update contact: ${err.message}` });
    }
});

// Delete Contact
router.delete('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const contact = await Contact.findOneAndDelete({ _id: id, userId: req.user.id }); // Ensure the user owns the contact
        if (!contact) return res.status(404).json({ message: 'Contact not found' });
        res.status(200).json({ message: 'Contact deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: `Failed to delete contact: ${err.message}` });
    }
});

// Export Contacts to Excel
router.get('/export/excel', verifyToken, async (req, res) => {
    const { id: userId } = req.user;

    try {
        const contacts = await Contact.find({ userId });
        const worksheet = XLSX.utils.json_to_sheet(contacts);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=contacts_${userId}_${Date.now()}.xlsx`
        );
        res.send(buffer);
    } catch (err) {
        res.status(500).json({ message: `Failed to export contacts to Excel: ${err.message}` });
    }
});

// Export Contacts to CSV
router.get('/export/csv', verifyToken, async (req, res) => {
    const { id: userId } = req.user;

    try {
        const contacts = await Contact.find({ userId });
        const fields = [
            'name',
            'email',
            'phone',
            'address',
            'category',
            'isFavorite',
            'notes',
            'lastContacted',
        ];
        const parser = new Parser({ fields });
        const csv = parser.parse(contacts);

        res.setHeader(
            'Content-Disposition',
            `attachment; filename=contacts_${userId}_${Date.now()}.csv`
        );
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: `Failed to export contacts to CSV: ${err.message}` });
    }
});

module.exports = router;
