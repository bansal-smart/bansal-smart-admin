

const pool = require('../../db/database');
const jwt = require('jsonwebtoken');



const fetchUnit = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM units WHERE deleted_at IS NULL'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


const fetchSubUnit = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM subunits WHERE deleted_at IS NULL AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


const fetchRestaurants = (req, params) => {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM restaurants WHERE deleted_at IS NULL AND status = 1 AND parent_id = 0'; 
        const values = [];

        if (params && params.is_home) {
            query += ' AND is_home = ?';
            values.push(params.is_home);
        }
        pool.query(query, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};
const fetchPlaces = (req, params) => {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM places WHERE deleted_at IS NULL'; 
        const values = [];

     
        pool.query(query, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};



const fetchSubCategories = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM categories WHERE deleted_at IS NULL AND parent_id != 0 AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};



const fetchBrands = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM brands WHERE deleted_at IS NULL AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};




const fetchTags = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT * FROM tags WHERE deleted_at IS NULL AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


const fetchBanners = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT title,banner_image FROM banners WHERE deleted_at IS NULL AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

const fetchOfferBanners = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT title,image FROM offerbanners WHERE deleted_at IS NULL AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


const fetchTestimonial = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT name,description,image FROM testimonials WHERE deleted_at IS NULL AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


const fetchInstaVideo = async () => {
    return new Promise((resolve, reject) => {
        const query = 'SELECT thumbnail_image,video_link FROM insta_videos WHERE deleted_at IS NULL AND status = 1'; 

        pool.query(query, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};


const fetchRestaurantlist = (req, params) => {

    
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM restaurants WHERE deleted_at IS NULL AND status = 1';
        const values = [];

        if (params && params.categoryId) {
            
            query += ' AND category = ?';
            values.push(params.categoryId);
        } else if (params && params.subcategoryId) {
            query += ' AND subcategory = ?';
            values.push(params.subcategoryId);
        } else if (params && params.spacialcat) {
            query += ' AND spacialcat = ?';
            values.push(params.spacialcat);
        }

        pool.query(query, values, (error, results) => {
            if (error) {
                console.error('Error fetching restaurants:', error);
                reject('Internal server error');
            } else {
                resolve(results);
            }
        });
    });
};


const fetchMenus = (req, params) => {
    return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM menus WHERE deleted_at IS NULL AND status = 1';
        const values = [];

        console.log("Params: ", params);

        if (params.restaurantId) {
            query += ' AND restaurant = ?';
            values.push(params.restaurantId);
        } 
        if (params.subcategoryId) {
            query += ' AND subcategory = ?';
            values.push(params.subcategoryId);
        } 
        if (params.spacialcat) {
            query += ' AND spacialcat = ?';
            values.push(params.spacialcat);
        } 
        if (params.minprice) {
            query += ' AND price >= ?';
            values.push(params.minprice);
        }
        if (params.maxprice) {
            query += ' AND price <= ?';
            values.push(params.maxprice);
        }

        pool.query(query, values, (error, results) => {
            if (error) {
                console.error('Error fetching menus:', error);
                reject('Internal server error');
            } else if (!results || results.length === 0) {
                console.log("No menus found");
                resolve([]);  
            } else {
               
                const fetchImagesForMenu = (menu) => {
                    return new Promise((resolve, reject) => {
                        const innerQuery = `SELECT image_path FROM menu_images WHERE menu_id = ?`;
                        pool.query(innerQuery, [menu.id], (error, imageResults) => {
                            if (error) {
                                console.error('Error fetching menu images for menu:', menu.id, error);
                                reject('Internal server error');
                            } else {
                               
                                resolve({ ...menu, menuImages: imageResults });
                            }
                        });
                    });
                };

                const fetchAllImages = async () => {
                    return Promise.all(results.map((menu) => fetchImagesForMenu(menu)));
                };

                fetchAllImages()
                    .then((menusWithImages) => {
                        resolve(menusWithImages);
                    })
                    .catch((error) => {
                        console.error('Error fetching images for menus:', error);
                        reject('Internal server error');
                    });
            }
        });
    });
};

const fetchMenuDetail = (req, params) => {
    return new Promise((resolve, reject) => {
        console.log(params.menuId);  
        
        let query = 'SELECT * FROM menus WHERE deleted_at IS NULL AND status = 1';
        const values = [];

        if (params.menuId) {
            query += ' AND id = ?';
            values.push(params.menuId);
        }

        pool.query(query, values, (error, results) => {
            if (error) {
                console.error('Error fetching menus:', error);
                reject('Internal server error');
            } else if (!results || results.length === 0) {
                
                resolve(null);
            } else {
                const menu = results[0];  

                const fetchImagesForMenu = (menu) => {
                    return new Promise((resolve, reject) => {
                        const innerQuery = `SELECT image_path FROM menu_images WHERE menu_id = ?`;
                        pool.query(innerQuery, [menu.id], (error, imageResults) => {
                            if (error) {
                                console.error('Error fetching menu images for menu:', menu.id, error);
                                reject('Internal server error');
                            } else {
                                resolve({ ...menu, menuImages: imageResults });
                            }
                        });
                    });
                };

              
                fetchImagesForMenu(menu)
                    .then((menuWithImages) => {
                        resolve(menuWithImages);  
                    })
                    .catch((error) => {
                        console.error('Error fetching images for menu:', error);
                        reject('Internal server error');
                    });
            }
        });
    });
};




module.exports = {fetchUnit,fetchSubUnit,fetchRestaurants,fetchPlaces,fetchSubCategories,fetchBrands,fetchTags,fetchMenus,fetchBanners,fetchOfferBanners,
    fetchTestimonial,fetchInstaVideo,fetchRestaurantlist,fetchMenuDetail};
