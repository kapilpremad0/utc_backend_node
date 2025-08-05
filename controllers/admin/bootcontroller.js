// controllers/bootController.js
const Boot = require('../../models/Boot');


// Format error helper
const formatError = (field, message) => ({ [field]: message });

exports.getAllBoots = async (req, res) => {
    try {
        const boots = await Boot.find();
        res.json(boots);
    } catch (error) {
        console.error('Error fetching boots:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.createBoot = async (req, res) => {
    try {
        const {
            boot_amount,
            max_blind,
            max_chaal,
            max_pot_amount,
            min_buy_in,
            max_buy_in
        } = req.body || {};

        const errors = {};

        if (!boot_amount) {
            Object.assign(errors, formatError('boot_amount', 'The boot_amount field is required.'));
        }
        if (!max_blind) {
            Object.assign(errors, formatError('max_blind', 'The max_blind field is required.'));
        }
        if (!max_chaal) {
            Object.assign(errors, formatError('max_chaal', 'The max_chaal field is required.'));
        }
        if (!max_pot_amount) {
            Object.assign(errors, formatError('max_pot_amount', 'The max_pot_amount field is required.'));
        }

        if (Object.keys(errors).length > 0) {
            return res.status(422).json({ message: 'Validation Error', errors });
        }

        // Check if boot_amount already exists
        const bootExists = await Boot.findOne({ boot_amount });
        if (bootExists) {
            return res.status(422).json({
                message: 'Validation Error',
                errors: formatError('boot_amount', 'This boot amount already exists.')
            });
        }

        const newBoot = new Boot({
            boot_amount,
            max_blind,
            max_chaal,
            max_pot_amount,
            min_buy_in: min_buy_in || 0,
            max_buy_in: max_buy_in || 0,
        });

        await newBoot.save();

        return res.status(200).json({
            message: 'Boot settings created successfully',
            success: true,
            data: newBoot
        });
    } catch (err) {
        console.error('Create Boot Setting Error:', err);
        return res.status(500).json({
            message: 'Server Error',
            success: false
        });
    }
};


exports.getBootById = async (req, res) => {
    try {
        const boot = await Boot.findById(req.params.id);
        if (!boot) {
            return res.status(404).json({ message: 'Boot not found' });
        }
        res.json(boot);
    } catch (error) {
        console.error('Error fetching boot by ID:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /boots/:id
exports.updateBootById = async (req, res) => {
    try {
        const {
            boot_amount,
            max_blind,
            max_chaal,
            max_pot_amount,
            min_buy_in,
            max_buy_in
        } = req.body;

        const updated = await Boot.findByIdAndUpdate(
            req.params.id,
            {
                boot_amount,
                max_blind,
                max_chaal,
                max_pot_amount,
                min_buy_in,
                max_buy_in,
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Boot not found' });
        }

        res.status(200).json({
            message: 'Boot updated successfully',
            success: true,
            data: updated,
        });
    } catch (error) {
        console.error('Error updating boot:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /boots/:id
exports.deleteBootById = async (req, res) => {
    try {
        const deleted = await Boot.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Boot not found' });
        }
        res.status(200).json({ message: 'Boot deleted successfully' });
    } catch (error) {
        console.error('Error deleting boot:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
