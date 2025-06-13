const pool = require('../../db/database');
const bcrypt = require('bcrypt');
const { validateRequiredFields } = require('../../helpers/validationsHelper');

// List Centers
const List = async (req, res) => {
    try {
        let getQuery = 'SELECT * FROM centers WHERE parent_id = 0';
        const isTrashed = req.query.status === 'trashed';

        getQuery += isTrashed ? ' AND deleted_at IS NOT NULL' : ' AND deleted_at IS NULL';
        const page_name = isTrashed ? 'Trashed Center List' : 'Center List';

        const centers = await new Promise((resolve, reject) => {
            pool.query(getQuery, (error, results) => error ? reject(error) : resolve(results));
        });

        res.render('admin/center/list', {
            success: req.flash('success'),
            error: req.flash('error'),
            centers,
            page_name,
            req
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/center-list');
    }
};

// Render Create Form
const Create = async (req, res) => {
    res.render('admin/center/create', {
        success: req.flash('success'),
        error: req.flash('error'),
        center: undefined,
        form_url: '/admin/center-store',
        page_name: 'Create'
    });
};

// Store New Center
const Store = async (req, res) => {
    try {
        const { name, email, mobile, password, confirm_password, slug, status } = req.body;
        const is_home = req.body.is_home ? 1 : 0;
        const center_image = req.files?.length ? req.files.map(file => file.path.replace(/\\/g, '/')).join(',') : '';

        const requiredFields = ['name', 'email', 'mobile', 'password', 'confirm_password', 'slug', 'status'];
        const missingFields = validateRequiredFields(req, res, requiredFields);
        const errors = [...missingFields];

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: 'email', message: 'Invalid email format' });
        if (!/^\d{10}$/.test(mobile)) errors.push({ field: 'mobile', message: 'Mobile must be 10 digits' });
        if (password !== confirm_password) errors.push({ field: 'confirm_password', message: 'Passwords do not match' });

        if (errors.length) {
            req.flash('error', errors[0].message);
            return res.redirect('/admin/center-create');
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const insertQuery = `INSERT INTO centers (name, email, mobile, password, slug, status, image, is_home) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [name, email, mobile, hashedPassword, slug, status, center_image, is_home];

        await new Promise((resolve, reject) => {
            pool.query(insertQuery, values, (err, result) => err ? reject(err) : resolve(result));
        });

        req.flash('success', 'Center saved successfully');
        res.redirect('/admin/center-list');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/center-create');
    }
};

// Render Edit Form
const Edit = async (req, res) => {
    try {
        const centerId = req.params.postId;
        const center = await new Promise((resolve, reject) => {
            pool.query('SELECT * FROM centers WHERE id = ?', [centerId], (err, result) => err ? reject(err) : resolve(result[0]));
        });

        res.render('admin/center/create', {
            success: req.flash('success'),
            error: req.flash('error'),
            center,
            form_url: `/admin/center-update/${centerId}`,
            page_name: 'Edit'
        });
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/center-list');
    }
};

// Update Center
const Update = async (req, res) => {
    const centerId = req.params.postId;
    try {
        const { name, email, mobile, slug, status } = req.body;
        const is_home = req.body.is_home ? 1 : 0;
        const center_image = req.files?.length ? req.files.map(file => file.path.replace(/\\/g, '/')).join(',') : '';

        const requiredFields = ['name', 'email', 'mobile', 'slug', 'status'];
        const missingFields = validateRequiredFields(req, res, requiredFields);
        const errors = [...missingFields];

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push({ field: 'email', message: 'Invalid email format' });
        if (!/^\d{10}$/.test(mobile)) errors.push({ field: 'mobile', message: 'Mobile must be 10 digits' });

        if (errors.length) {
            req.flash('error', errors[0].message);
            return res.redirect(`/admin/center-edit/${centerId}`);
        }

        const updateQuery = `UPDATE centers SET name=?, email=?, mobile=?, slug=?, image=?, is_home=?, status=? WHERE id=?`;
        const values = [name, email, mobile, slug, center_image, is_home, status, centerId];

        await new Promise((resolve, reject) => {
            pool.query(updateQuery, values, (err, result) => err ? reject(err) : resolve(result));
        });

        req.flash('success', 'Center updated successfully');
        res.redirect('/admin/center-list');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect(`/admin/center-edit/${centerId}`);
    }
};

// Soft Delete Center
const Delete = async (req, res) => {
    try {
        const centerId = req.params.postId;
        await new Promise((resolve, reject) => {
            pool.query('UPDATE centers SET deleted_at = NOW() WHERE id = ?', [centerId], (err, result) => err ? reject(err) : resolve(result));
        });
        req.flash('success', 'Center moved to trash');
        res.redirect('/admin/center-list');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/center-list');
    }
};

// Restore Center
const Restore = async (req, res) => {
    try {
        const centerId = req.params.postId;
        await new Promise((resolve, reject) => {
            pool.query('UPDATE centers SET deleted_at = NULL WHERE id = ?', [centerId], (err, result) => err ? reject(err) : resolve(result));
        });
        req.flash('success', 'Center restored successfully');
        res.redirect('/admin/center-list');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/center-list');
    }
};

// Permanent Delete Center
const PermanentDelete = async (req, res) => {
    try {
        const centerId = req.params.postId;
        await new Promise((resolve, reject) => {
            pool.query('DELETE FROM centers WHERE id = ?', [centerId], (err, result) => err ? reject(err) : resolve(result));
        });
        req.flash('success', 'Center permanently deleted');
        res.redirect('/admin/center-list');
    } catch (error) {
        req.flash('error', error.message);
        res.redirect('/admin/center-list');
    }
};

module.exports = {
    List,
    Create,
    Store,
    Edit,
    Update,
    Delete,
    Restore,
    PermanentDelete
};
