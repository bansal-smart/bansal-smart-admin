const pool = require('../../db/database');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');
const apiURL = 'https://api.matchmakers.world/';

const HomeController = {
    index: (req, res) => {
        const pageTitle = "Home Page";
        const welcomeMessage = "Welcome to our website!";
        
        res.render('front/home', { title: pageTitle, message: welcomeMessage });
    },

	AboutUs: (req, res) => {
        res.render('front/about-us');
    }
};


module.exports = HomeController;
