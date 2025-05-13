
const pool = require('../../../db/database');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');

const {fetchMenus,fetchMenuDetail,fetchBanners,fetchRestaurants,fetchPlaces,fetchOfferBanners,fetchTestimonial,fetchInstaVideo} = require('../../Admin/CommonController');
const { response } = require('express');
const { json } = require('body-parser');


const ApiController = {

    
    home_api: async (req, res) => {
        try {
            
       
            const tranding_pros = await fetchRestaurants(req, { spacialcat: 'Trending Menus' });
    
            
            const restaurants = await fetchMenus(req, res);
            const places = await fetchPlaces(req, res);

            
            const newarrival_pros = await fetchRestaurants(req, { spacialcat: 'New Arrival' });
    
            
            const Homerestaurants = await fetchMenus(req, { is_home: 1 });
    
            
            const menusByRestaurant = await Promise.all(Homerestaurants.map(async (restaurant) => {
                const menus = await fetchRestaurants(req, { menuId: restaurant.id });
                return { restaurant: restaurant.title, menus: menus };
            }));

            const params = { };

            const restaurant_list = await fetchRestaurants(req, params);  

    
            res.status(200).json({
                status: true,
                msg: 'Home List',
                menu: restaurants,
                place: places,
                restaurant_list: restaurant_list,
               
            });
        } catch (error) {
            console.error('Error in home_api:', error);
            res.status(500).json({ error: 'Internal server error' , details: error.message});
        }
    },
    
    

    restaurant: (req, res) => {
        
        pool.query('SELECT * FROM restaurants WHERE deleted_at IS NULL AND status = 1 AND parent_id = 0', (error, results) => {
            if (error) {
                console.error('Error fetching Menu images:', error);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                
                
                res.json(results);
            }
        });
    },

    place: (req, res) => {
        
        pool.query('SELECT * FROM places WHERE deleted_at IS NULL', (error, results) => {
            if (error) {
                console.error('Error fetching Places images:', error);
                res.status(500).json({ error: 'Internal server error' });
            } else {
                
                
                res.json(results);
            }
        });
    },

    menu: async (req, res) => {
        const { restaurantId, subrestaurantId, minprice, maxprice } = req.query;
    
        const params = { restaurantId, subrestaurantId, minprice, maxprice };
        
        try {
            const menu_list = await fetchMenus(req, params);  
            
            if (!menu_list || menu_list.length === 0) {  
                return res.status(404).json({ error: 'Menu not found' });
            }
            
            res.json(menu_list);  
        } catch (error) {
            console.error('Error fetching Menu:', error);  
            res.status(500).json({ error: 'Internal server error' });
        }
    },
    

    menuDetail: async (req, res) => {
        const { menuId } = req.query;
        if (!menuId) {
            return res.status(400).json({ error: 'menu Id is required' });
        }
        const params = { menuId };    
        try {
            const menu = await fetchMenuDetail(req, params);  
            if (!menu) {
                return res.status(404).json({ error: 'Restaurant not found' });
            }
            res.json(menu);
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    Addcart: async (req, res) => {
        try {
            const customerId = req.customer.id; 
            const { menuId, quantity } = req.body; 
             
            if (!menuId || quantity === undefined || quantity === null || quantity === '') {
                return res.status(400).json({ status: false, msg: 'Menu ID and valid quantity are required' });
            }
    
          
            const checkQuery = 'SELECT * FROM cart WHERE customer_id = ? AND menu_id = ?';
            pool.query(checkQuery, [customerId, menuId], (error, result) => {
                if (error) {
                    console.error('Error checking cart:', error);
                    return res.status(500).json({ status: false, msg: 'Internal server error' });
                }

                

                
                if (result.length > 0 && quantity === 0) {
                    const deleteQuery = 'DELETE FROM cart WHERE customer_id = ? AND menu_id = ?';
                    pool.query(deleteQuery, [customerId, menuId], (error, result) => {
                        if (error) {
                            console.error('Error deleting menu from cart:', error);
                            return res.status(500).json({ status: false, msg: 'Internal server error' });
                        }
                        return res.status(200).json({ status: true, msg: 'Menu deleted from cart' });
                    });
                }
                
                else if (result.length > 0 && quantity > 0) {
                    const updateQuery = 'UPDATE cart SET quantity = ? WHERE customer_id = ? AND menu_id = ?';
                    pool.query(updateQuery, [quantity, customerId, menuId], (error, result) => {
                        if (error) {
                            console.error('Error updating cart:', error);
                            return res.status(500).json({ status: false, msg: 'Internal server error' });
                        }
                        return res.status(200).json({ status: true, msg: 'Menu quantity updated in the cart' });
                    });
                }
                
                else if (result.length === 0) {
                    const insertQuery = 'INSERT INTO cart (customer_id, menu_id, quantity) VALUES (?, ?, ?)';
                    pool.query(insertQuery, [customerId, menuId, quantity], (error, result) => {
                        if (error) {
                            console.error('Error adding menu to cart:', error);
                            return res.status(500).json({ status: false, msg: 'Internal server error' });
                        }
                        return res.status(200).json({ status: true, msg: 'Menu added to cart' });
                    });
                }
            });
        } catch (error) {
            console.error('Error in add to cart API:', error);
            res.status(500).json({ status: false, msg: 'Internal server error' });
        }
    },

    cartlist: async (req, res) => {
        try {
            
            const cartList = await new Promise((resolve, reject) => {
                const query = `
                   SELECT 
                    cart.id AS cart_id,
                    cart.quantity,
                    menus.id AS menu_id,
                    menus.name AS menu_name,
                    menus.price,
                    menus.description,
                    menus.menu_image
                    FROM cart
                    INNER JOIN menus ON cart.menu_id = menus.id
                    AND cart.customer_id = ?;  -- Assuming cart is customer-specific
                `;
    
                const customerId = req.customer.id; 
                
                pool.query(query, [customerId], (error, results) => {
                    if (error) {
                        console.error('Error fetching cart list:', error);
                        reject('Internal server error');
                    } else if (results.length === 0) {
                        resolve([]);
                    } else {
                        resolve(results);
                    }
                });
            });
    
            res.status(200).json({
                status: true,
                msg: 'Cart List with Menu Details',
                data: cartList,
            });
        } catch (error) {
            console.error('Error in cartlist:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

        
    

   CreateOrder: async (req, res) => {
    try {
            const customerId = req.customer.id; 

            const cartQuery = `
                SELECT 
                    cart.id AS cart_id,
                    cart.quantity,
                    menus.id AS menu_id,
                    menus.name AS menu_name,
                    menus.price
                FROM cart
                INNER JOIN menus ON cart.menu_id = menus.id
                WHERE cart.customer_id = ?;
            `;

            pool.query(cartQuery, [customerId], async (error, cartItems) => {
                if (error) {
                    console.error('Error fetching cart:', error);
                    return res.status(500).json({ status: false, msg: 'Internal server error' });
                }

                if (cartItems.length === 0) {
                    return res.status(400).json({ status: false, msg: 'Your cart is empty' });
                }

                let totalAmount = 0;
                for (let item of cartItems) {
                    totalAmount += item.quantity * item.price;
                }

                const transactionId = req.body.transaction_id;
                let paymentStatus = 'pending';
                if(req.body.transaction_id)
                {
                    paymentStatus = 'complete';
                }
                
                const userName = req.body.user_name;
                const userMobile = req.body.user_mobile;
                const userEmail = req.body.user_email;
                const userAddress = req.body.user_address;
                const userPincode = req.body.user_pincode;
                const userState = req.body.user_state;
                const userCity = req.body.user_city;
                const paymentMethod = req.body.payment_method;

                const createOrderQuery = 'INSERT INTO orders (customer_id, total_amount, transaction_id, payment_status, user_name, user_mobile, user_email, user_address, user_pincode, user_state, user_city, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                pool.query(createOrderQuery, [customerId, totalAmount, transactionId, paymentStatus, userName, userMobile, userEmail, userAddress, userPincode, userState, userCity, paymentMethod], (error, orderResult) => {
                    if (error) {
                        console.error('Error creating order:', error);
                        return res.status(500).json({ status: false, msg: 'Internal server error' });
                    }

                    const orderId = orderResult.insertId;

                    const orderItemsQuery = 'INSERT INTO order_items (order_id, menu_id, quantity, price) VALUES ?';
                    const orderItemsData = cartItems.map(item => [
                        orderId,
                        item.menu_id,
                        item.quantity,
                        item.price
                    ]);

                    pool.query(orderItemsQuery, [orderItemsData], (error) => {
                        if (error) {
                            console.error('Error inserting order items:', error);
                            return res.status(500).json({ status: false, msg: 'Internal server error' });
                        }

                        const deleteCartQuery = 'DELETE FROM cart WHERE customer_id = ?';
                        pool.query(deleteCartQuery, [customerId], (error) => {
                            if (error) {
                                console.error('Error updating cart:', error);
                                return res.status(500).json({ status: false, msg: 'Internal server error' });
                            }

                            res.status(200).json({
                                status: true,
                                msg: 'Order placed successfully',
                                orderId: orderId,
                            });
                        });
                    });
                });
            });
        } catch (error) {
            console.error('Error in create order API:', error);
            res.status(500).json({ status: false, msg: 'Internal server error' });
        }
    }


    // CreateOrder: async (req, res) => {
    //     try {
    //         const userId = req.user.id;
    
    //         // Validate input
    //         const validationError = await validations.validate(req, res, validations.CreateOrderValidationRules);
    //         if (validationError) {
    //             return res.status(400).json({ status: false, msg: validationError });
    //         }
    
    //         // Check transaction ID for payment capture
    //         const transactionId = req.body.transaction_id;
    //         if (!transactionId) {
    //             return res.status(400).json({ status: false, msg: 'Transaction ID is required for payment capture' });
    //         }
    
    //         // Fetch payment details
    //         const paymentDetails = await razorpay.payments.fetch(transactionId);
    //         if (paymentDetails.status !== "authorized") {
    //             return res.status(400).json({ status: false, msg: 'Payment is not authorized for capture' });
    //         }
    
    //         // Capture payment
    //         const capturedPayment = await razorpay.payments.capture(transactionId, paymentDetails.amount); // Amount in paisa
    //         console.log("Captured Payment:", capturedPayment);
    
    //         // Fetch cart items
    //         const cartItems = await new Promise((resolve, reject) => {
    //             const query = `
    //                 SELECT 
    //                     cart.id AS cart_id,
    //                     cart.quantity,
    //                     cart.size,
    //                     cart.variant_id,
    //                     cart.quantity,
    //                     products.id AS product_id,
    //                     products.name AS product_name,
    //                     products.price,
    //                     products.description
    //                 FROM cart
    //                 INNER JOIN products ON cart.product_id = products.id
    //                 WHERE cart.user_id = ?;
    //             `;
    //             pool.query(query, [userId], (error, results) => {
    //                 if (error) {
    //                     console.error('Error fetching cart list:', error);
    //                     return reject(new Error('Error fetching cart items'));
    //                 }
    //                 resolve(results || []);
    //             });
    //         });
    
    //         if (cartItems.length === 0) {
    //             return res.status(400).json({ status: false, msg: 'Your cart is empty' });
    //         }
    
    //         // Calculate total amount
    //         let totalAmount = cartItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
    //         const fullprice = totalAmount;
    //         const platformFees = 10; // Adding platform fees
    //         totalAmount += platformFees;
    
    //         let couponCode = '';
    //         let couponAmount = 0;
    
           
    
    //         // Fetch address details
    //         let user_name = '', user_mobile = '', user_email = '', user_address = '', user_pincode = '', user_state = '', user_city = '';
    //         if (req.body.address_id) {
    //             const addressDetails = await common_helper.gettabledata('user_address', 'id = ?', [req.body.address_id]);
    //             if (!addressDetails || addressDetails.length === 0 || !addressDetails[0]) {
    //                 return res.status(404).json({ status: false, msg: 'Address not found' });
    //             }
    //             const address = addressDetails[0];
    //             user_name = address.name;
    //             user_mobile = address.mobile_number;
    //             user_email = address.email;
    //             user_address = address.full_address;
    //             user_pincode = address.pincode;
    //             user_state = address.state;
    //             user_city = address.city;
    //         }
    
    //         // Create an order in your database
    //         const orderId = `KG${Date.now()}`;
    //         await new Promise((resolve, reject) => {
    //             const query = `
    //                 INSERT INTO orders 
    //                 (user_id, address_id, order_id, total_amount, order_status, coupon_code, coupon_amt, after_discount, transaction_id, payment_status, payment_method, user_name, user_mobile, user_email, user_address, user_pincode, user_state, user_city) 
    //                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    //             `;
    //             pool.query(query, [
    //                 userId,
    //                 req.body.address_id,
    //                 orderId,
    //                 fullprice,
    //                 'Pending',
    //                 couponCode,
    //                 couponAmount,
    //                 totalAmount,
    //                 transactionId,
    //                 'Captured',
    //                 req.body.payment_method || 'Online',
    //                 user_name,
    //                 user_mobile,
    //                 user_email,
    //                 user_address,
    //                 user_pincode,
    //                 user_state,
    //                 user_city,
    //             ], (error) => {
    //                 if (error) {
    //                     console.error('Error creating order:', error);
    //                     return reject(new Error('Error creating order'));
    //                 }
    //                 resolve();
    //             });
    //         });
    
    //         // Insert order items
    //         const orderItemsData = cartItems.map(item => [
    //             orderId,
    //             item.product_id,
    //             item.quantity,
    //             item.size,
    //             item.variant_id,
    //             item.price,
    //             item.price * item.quantity,
    //         ]);
    
    //         await new Promise((resolve, reject) => {
    //             const orderItemsQuery = 'INSERT INTO order_items (order_id, product_id, quantity,size,variant_id, price, totalamount) VALUES ?';
    //             pool.query(orderItemsQuery, [orderItemsData], (error) => {
    //                 if (error) {
    //                     console.error('Error inserting order items:', error);
    //                     return reject(new Error('Error inserting order items'));
    //                 }
    //                 resolve();
    //             });
    //         });
    
    //         // Clear cart
    //         await new Promise((resolve, reject) => {
    //             pool.query('DELETE FROM cart WHERE user_id = ?', [userId], (error) => {
    //                 if (error) {
    //                     console.error('Error clearing cart:', error);
    //                     return reject(new Error('Error clearing cart'));
    //                 }
    //                 resolve();
    //             });
    //         });
    
    //         // Return success response
    //         return res.status(200).json({
    //             status: true,
    //             msg: 'Order created successfully',
    //             orderId,
    //         });
    //     } catch (error) {
    //         console.error('Error in create order API:', error.message || error);
    //         return res.status(500).json({ status: false, msg: 'Internal server error' });
    //     }
    // }
    
};


module.exports = ApiController;
