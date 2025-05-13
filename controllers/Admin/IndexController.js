
const pool = require('../../db/database');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');


const dashboard = async (req, res) => {
    try {
        res.render('admin/dashboard', {
            success: req.flash('success'),
            error: req.flash('error'),
            user: req.customer  // Pass user to the view
        });
    } catch (error) {
        console.log(error.message);
    }
};

const restaurantdashboard = async (req, res) => {
    try {
        res.render('admin/restaurantdashboard', {
            success: req.flash('success'),
            error: req.flash('error'),
            user: req.restaurant  // Pass user to the view
        });
    } catch (error) {
        console.log(error.message);
    }
};


module.exports = {dashboard,restaurantdashboard};
