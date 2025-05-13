

const Customer = require('../../../models/customerModel');
const Restaurant = require('../../../models/restaurantModel');
const jwt = require('jsonwebtoken');
const {validateRequiredFields} = require('../../../helpers/validationsHelper');
const bcrypt = require('bcrypt');


const generateOtp = () => 123456;//Math.floor(100000 + Math.random() * 900000);

const JWT_SECRET = 'your_jwt_secret_key'; 

const AuthApiController = {
    
    sendOtp: (req, res) => {
        const { mobileNumber } = req.body;
        
        if (!mobileNumber) {
            return res.status(400).json({ error: 'Mobile number is required' });
        }
    
        const isValidMobile = /^\d{10}$/.test(mobileNumber);
        if (!isValidMobile) {
            return res.status(400).json({ error: 'Mobile number must be 10 digits' });
        }
    
        
        Customer.findByMobile(mobileNumber, (err, customer) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
    
            if (!customer) {
                
                Customer.create(mobileNumber, (err, newCustomer) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to create customer' });
                    }
    
                    
                    const otp = generateOtp();
    
                    
                    Customer.saveOtp(mobileNumber, otp, (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to save OTP' });
                        }
    
                        
                        res.json({ message: 'OTP sent successfully', otp }); 
                    });
                });
            } else {
                
                const otp = generateOtp();
    
                
                Customer.saveOtp(mobileNumber, otp, (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to save OTP' });
                    }
    
                    
                    res.json({ message: 'OTP sent successfully', otp }); 
                });
            }
        });
    },
    
    
    verifyOtp: (req, res) => {
        const { mobileNumber, otp } = req.body;

        
        if (!mobileNumber || !otp) {
            return res.status(400).json({ error: 'Mobile number and OTP are required' });
        }

        
        Customer.verifyOtp(mobileNumber, otp, (err, customer) => {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
            if (!customer) {
                return res.status(400).json({ error: 'Invalid OTP or OTP expired' });
            }

            
            const payload = { id: customer.id, mobile: customer.mobile };

            
            const access_token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
            

            
            res.json({ message: 'OTP verified successfully', access_token ,customer});
        });
    },

    restaurantRegister : (req, res) => {
      
        try {
            const { name, email, mobile, password, confirm_password } = req.body;
            let restaurant_image = '';
    
            if (req.files && req.files.length > 0) {
                restaurant_image = req.files.map(file => file.path.replace(/\\/g, '/')).join(',');
            }
    
            const is_home = req.body.is_home ? 1 : 0;
            const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            const isValidMobile = /^\d{10}$/.test(mobile);
    
            const requiredFields = ['name', 'email', 'mobile', 'password', 'confirm_password'];
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
                return res.status(400).json({ error: errors[0].message });
            }
    
            const hashedPassword = bcrypt.hashSync(password, 10);
    
            Restaurant.create(name, email, mobile, hashedPassword, restaurant_image, is_home, (err, newRestaurant) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to create restaurant', details: err.message });
                }
    
                res.json({ message: 'Restaurant registered successfully', newRestaurant });
            });
        } catch (err) {
            return res.status(500).json({ error: 'Internal server error', details: err.message  });
        }
    },
    
};

module.exports = AuthApiController;
