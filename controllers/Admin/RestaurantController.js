const pool = require('../../db/database');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');

const {validateRequiredFields} = require('../../helpers/validationsHelper');
const bcrypt = require('bcrypt');

const List = async(req,res)=>{
    try{

        let getQuery = 'SELECT * FROM restaurants WHERE parent_id = 0';

        if (req.query.status && req.query.status === 'trashed') {
            getQuery += ' AND deleted_at IS NOT NULL';
        } else {
            getQuery += ' AND deleted_at IS NULL';
        }


        const page_name = (req.query.status && req.query.status === 'trashed' ? 'Trashed Restaurant List' : 'Restaurant List');

        const restaurants = await new Promise((resolve, reject) => {
            pool.query(getQuery, function (error, result) {
                if (error) {
                    req.flash('error', error.message);
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    
        res.render('admin/restaurant/list', { 
            success: req.flash('success'),
            error: req.flash('error'),
            restaurants: restaurants,
            page_name: page_name,
            req:req
        });
    }
    catch(error)
    {
        console.log(error.message);
        req.flash('error', error.message);
    }
}

const Create = async(req,res)=>{
    try{
        const restaurant = undefined; 

        res.render('admin/restaurant/create',{ success: req.flash('success'),
                                            error: req.flash('error'),
                                            restaurant: restaurant,
                                            form_url: '/admin/restaurant-store',
                                            page_name: 'Create' });
    }
    catch(error)
    {
        console.log(error.message);
    }
}

const Store = async(req,res)=>{
    try {
        const { name, email, mobile, password, confirm_password, slug, status } = req.body;
        let restaurant_image = '';
    
        if (req.files && req.files.length > 0) {
            restaurant_image = req.files.map(file => file.path.replace(/\\/g, '/')).join(',');
        }
    
        const is_home = req.body.is_home ? 1 : 0;
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isValidMobile = /^\d{10}$/.test(mobile);
    
        const requiredFields = ['name', 'email', 'mobile', 'password', 'confirm_password', 'slug', 'status'];
        const missingFields = validateRequiredFields(req, res, requiredFields);
        const errors = [];
    
        if (missingFields.length > 0) {
            errors.push(...missingFields);
        }
    
        if (!isValidEmail) {
            errors.push({ field: 'email', message: 'Invalid email format' });
        }
    
        if (!isValidMobile) {
            errors.push({ field: 'mobile', message: 'Mobile number must be 10 digits' });
        }
    
        if (password !== confirm_password) {
            errors.push({ field: 'confirm_password', message: 'Confirm Password should be the same as Password' });
        }
    
        if (errors.length > 0) {
            req.flash('error', errors[0].message);
            return res.redirect('/admin/restaurant-create');
        }
        const hashedPassword = bcrypt.hashSync(password, 10);

        const insertQuery = `INSERT INTO restaurants (name, email, mobile, password, slug, status, image, is_home) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const values = [name, email, mobile, hashedPassword, slug, status, restaurant_image, is_home];
    
        pool.query(insertQuery, values, function (error, result) {
            if (error) {
                console.error(error);
                req.flash('error', error.message);
                return res.redirect('/admin/restaurant-create');
            }
            req.flash('success', 'Saved Successfully');
            res.redirect('/admin/restaurant-list');
        });
    }     
    catch (error) {
        console.error(error);
        return req.flash('error',error.message);
    }
    
}

const Edit = async(req,res)=>{
    try {
        const restaurantId = req.params.restaurantId; 
 
       
        const getrestaurantQuery = 'SELECT * FROM restaurants WHERE id = ?';
        const restaurant = await new Promise((resolve, reject) => {
            pool.query(getrestaurantQuery, [restaurantId], function (error, result) {
                if (error) {
                    console.error(error);
                    req.flash('error', error.message);
                    reject(error);
                } else {
                    resolve(result[0]); 
                }
            });
        });

        
        res.render('admin/restaurant/create', {
            success: req.flash('success'),
            error: req.flash('error'),
            restaurant: restaurant,
            form_url: '/admin/restaurant-update/' + restaurantId,
            page_name: 'Edit'
        });
    } catch (error) {
        return  req.flash('error', error.message);
    }

}

const Update = async (req, res) => {
    const restaurantId = req.params.restaurantId;

    try {
        console.log(req.body);
        let restaurant_image = '';

        if (req.files && req.files.length > 0) {
            restaurant_image = req.files.map(file => file.path.replace(/\\/g, '/')).join(',');
        }

        let is_home = req.body.is_home ? 1 : 0;

        const { name, email, mobile, slug, status } = req.body;

        const requiredFields = ['name', 'email', 'mobile', 'slug', 'status'];
        const missingFields = validateRequiredFields(req, res, requiredFields);
        const errors = [];

        if (missingFields.length > 0) {
            errors.push(...missingFields);
        }

        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isValidMobile = /^\d{10}$/.test(mobile);

        if (!isValidEmail) {
            errors.push({ field: 'email', message: 'Invalid email format' });
        }

        if (!isValidMobile) {
            errors.push({ field: 'mobile', message: 'Mobile number must be 10 digits' });
        }

        if (errors.length > 0) {
            req.flash('error', errors[0].message);
            return res.redirect(`/admin/restaurant-edit/${restaurantId}`);
        }

        const updateQuery = `UPDATE restaurants SET name=?, email=?, mobile=?, slug=?, image=?, is_home=?, status=? WHERE id=?`;
        const values = [name, email, mobile, slug, restaurant_image, is_home, status, restaurantId];
        await new Promise((resolve, reject) => {
            pool.query(updateQuery, values, (updateError, updateResults) => {
                if (updateError) {
                    reject(updateError);
                } else {
                    resolve(updateResults);
                }
            });
        });

        req.flash('success', 'Data Updated');
        return res.redirect('/admin/restaurant-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/restaurant-edit/${restaurantId}`);
    }
};


const Delete = async(req,res)=>{
    try {
        const restaurantId = req.params.restaurantId;

        const softDeleteQuery = 'UPDATE restaurants SET deleted_at = NOW() WHERE id = ?';

        pool.query(softDeleteQuery, [restaurantId], (error, result) => {
            if (error) {
                console.error(error);
                return req.flash('success','Internal server error');
            }
        });

        req.flash('success','Restaurant soft deleted successfully');
        return res.redirect('/admin/restaurant-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/restaurant-list`);
    }
}


const Restore = async(req,res)=>{
    try {
        const restaurantId = req.params.restaurantId;

        const RestoreQuery = 'UPDATE restaurants SET deleted_at = null WHERE id = ?';

        pool.query(RestoreQuery, [restaurantId], (error, result) => {
            if (error) {
                console.error(error);
                return req.flash('success','Internal server error');
            }
        });

        req.flash('success','Restaurant Restored successfully');
        return res.redirect('/admin/restaurant-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/restaurant-list`);
    }
}

const PermanentDelete = async(req,res)=>{
    try {
        const restaurantId = req.params.restaurantId;

        const DeleteQuery = 'DELETE FROM restaurants WHERE id = ?';

        pool.query(DeleteQuery, [restaurantId], (error, result) => {
            if (error) {
                console.error(error);
                return req.flash('success','Internal server error');
            }
        });

        req.flash('success','Restaurant deleted successfully');
        return res.redirect('/admin/restaurant-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/restaurant-list`);
    }
}



module.exports = {Create,List,Store,Edit,Update,Delete,Restore,PermanentDelete};
