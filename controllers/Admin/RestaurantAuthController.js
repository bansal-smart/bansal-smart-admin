
const pool = require('../../db/database');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');


const login = async(req,res)=>{
    try{
        res.render('admin/auth/restaurantlogin', { message: "" });
    }
    catch(error){
        console.log(error.message);
    }
}


const Postlogin = async (req, res) => {
    try {

        const { email, password } = req.body;

        

      
        pool.query('SELECT * FROM restaurants WHERE email = ?', [email], async (error, rows) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: false, msg: 'Internal server error', error: error.message });
            }
          
            if (rows.length > 0) {
                const passwordMatch = await bcrypt.compare(password, rows[0].password);

                
                if (passwordMatch) {
                    if (rows[0].role === 'restaurant') {
                        const tokenResult = jwt.sign({ restaurantId: rows[0].id }, 'your_secret_restro_key', { expiresIn: '7d' });
                        res.cookie('access_token', tokenResult, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); 
                         
                        // ✅ Store role in session
                         req.session.userRole = rows[0].role;
                         res.userRole = rows[0].role;
                         res.restaurantId = rows[0].id;
                         console.log("✅ User role set in session:", req.session.userRole);
 
                        return res.redirect("/restaurant/dashboard");
                    } else {

                        return res.render('admin/auth/restaurantlogin', { message: " " });
                    }
                } else {
                    return res.render('admin/auth/restaurantlogin', { message: "password Not Match" });
                }
            } else {
            

                return res.render('admin/auth/restaurantlogin', { message: "Email and password Invalid" });
            }
        });
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ status: false, msg: 'Internal server error', error: error.message });
    }
}


const Logout = (req, res) => {
   
    res.clearCookie('access_token'); 
    res.redirect('/restaurant/login');
}


module.exports = {login,Postlogin,Logout};
