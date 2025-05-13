
const pool = require('../../db/database');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');
const {validateRequiredFields} = require('../../helpers/validationsHelper');
const {fetchRestaurants} = require('../Admin/CommonController');
const fs = require('fs'); 


const List = async(req,res)=>{
    try{

        let getQuery = 'SELECT * FROM menus'+
        (req.query.status && req.query.status === 'trashed' ? ' WHERE deleted_at IS NOT NULL' : ' WHERE deleted_at IS NULL');

        const page_name = (req.query.status && req.query.status === 'trashed' ? 'Trashed Menu List' : 'Menu List');
        
        const restaurantId = req.session.restaurantId;
        console.log("restaurantId",restaurantId);

        if (userRole === 'restaurant' && restaurantId) {
            getQuery += ` AND restaurant = ${restaurantId}`;
        }
        
        const menus = await new Promise((resolve, reject) => {
            pool.query(getQuery, function (error, result) {
                if (error) {
                    
                    req.flash('error', error.message);
                    reject(error);
                } else {
                    
                    resolve(result);
                }
            });
        });
    
        
        res.render('admin/menu/list', { 
            success: req.flash('success'),
            error: req.flash('error'),
            menus: menus,
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
        const menu = undefined; 
        
        const restaurants = await fetchRestaurants();

        res.render('admin/menu/create',{ success: req.flash('success'),
                                            error: req.flash('error'),
                                            menu: menu,
                                          
                                            restaurants: restaurants,
                                          
                                            form_url: '/admin/menu-store',
                                            page_name: 'Create' });
    }
    catch(error)
    {
        console.log(error.message);
    }
}

const Store = async (req, res) => {
    console.log(req.body);
    
    try {
        let menu_images = [];
        if (req.files && req.files.length > 0) {
            menu_images = req.files.map(file => file.path.replace(/\\/g, '/')); 
        }

        const { name, price, description, restaurant, slug, status } = req.body;

        
        let tags = '';
        if (typeof tag === 'string' && tag.trim() !== '') {
            const tagsArray = tag.split(',').map(tag => tag.trim()); 
            tags = tagsArray.join(','); 
        }

        
        const requiredFields = ['name',  'slug', 'price', 'restaurant', 'status'];
        const missingFields = validateRequiredFields(req, res, requiredFields);
        
        if (missingFields.length > 0) {
            req.flash('error', missingFields[0].message);
            return res.redirect('/admin/menu-create');
        }

        
        const insertQuery = 'INSERT INTO menus (name, price, description, restaurant, slug, status) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [name, price, description, restaurant, slug, status];

        
        pool.query(insertQuery, values, async function (error, result) {
            if (error) {
                console.error(error);
                req.flash('error', error.message);
            } else {
                try {

                    const menuId = result.insertId;

                    const sharp = require('sharp');

                    if (menu_images.length > 0) {
                        
                        const insertImageQuery = 'INSERT INTO menu_images (menu_id, image_path) VALUES (?, ?)';
                        for (let i = 0; i < menu_images.length; i++) {
                            const image = await sharp(menu_images[i]);
                            const metadata = await image.metadata();
                            const webpPath = menu_images[i].replace(metadata.format, 'webp');
                            await image
                                .resize()
                                .webp({ quality: 80 })
                                .toFormat('webp')
                                .toFile(webpPath);
                            await pool.query(insertImageQuery, [menuId, webpPath]);
                           
                            if (i === 0) {
                                const updateQuery = 'UPDATE menus SET restro_image = ? WHERE id = ?';
                                await pool.query(updateQuery, [webpPath, menuId]);
                            }

                            // fs.unlinkSync(menu_images[i]); 

                            fs.unlink(menu_images[i], (err) => {
                                if (err) {
                                    console.error(err);
                                }
                            });
                            
                        }
                    }


                 
                } catch (insertionError) {
                    console.error(insertionError);
                    req.flash('error', insertionError.message);
                }

                req.flash('success', 'Saved Successfully');
            }
            res.redirect('/admin/menu-list');
        });
    } catch (error) {
        console.error(error);
        req.flash('error', error.message);
        res.redirect('/admin/menu-create');
    }
};


const Edit = async(req,res)=>{
    try {
        const menuId = req.params.menuId; 

        const restaurants = await fetchRestaurants();
  
       
        const getmenuQuery = 'SELECT * FROM menus WHERE id = ?';
        const menu = await new Promise((resolve, reject) => {
            pool.query(getmenuQuery, [menuId], function (error, result) {
                if (error) {
                    console.error(error);
                    req.flash('error', error.message);
                    reject(error);
                } else {
                    resolve(result[0]); 
                }
            });
        });

        
        res.render('admin/menu/create', {
            success: req.flash('success'),
            error: req.flash('error'),
            menu: menu,
        
            restaurants: restaurants,
           
            form_url: '/admin/menu-update/' + menuId,
            page_name: 'Edit'
        });
    } catch (error) {
        return  req.flash('error', error.message);
    }

}

const Update = async (req, res) => {
    console.log(req.body);

    const menuId = req.params.menuId;

    try {
        let menu_images = [];

       

        if (req.files && req.files.length > 0) {
            menu_images = req.files.map(file => file.path.replace(/\\/g, '/')); 
        }

        if (menu_images.length > 0) {
            
            await pool.query('DELETE FROM menu_images WHERE menu_id = ?', [menuId]);
        }
        
        const { name, price, description, restaurant, slug, status } = req.body;

        
        const tags = typeof tag === 'string' ? tag.split(',').map(tag => tag.trim()) : '';

        
        const requiredFields = ['name',  'slug', 'price', 'restaurant', 'status']; 
       
        const missingFields = validateRequiredFields(req, res, requiredFields);
        const errors = [];

        if (missingFields.length > 0) {
            errors.push(...missingFields);
        }

        if (errors.length > 0) {
            req.flash('error', errors[0].message);
            return res.redirect(`/admin/menu-edit/${menuId}`);
        }
        //

        const updateQuery = 'UPDATE menus SET name=?, price=?, description=?, restaurant=?, slug=?, status=? WHERE id=?'; 
        const values = [name, price, description, restaurant, slug, status, menuId]; 

        

        
        const updateResults = await new Promise((resolve, reject) => {
            pool.query(updateQuery, values, async (updateError, updateResults) => {
                if (updateError) {
                    reject(updateError);
                } else {


                    try {

                   
                        const sharp = require('sharp');

                        
                        if (menu_images.length > 0) {
                            
                            const insertImageQuery = 'INSERT INTO menu_images (menu_id, image_path) VALUES (?, ?)';
                            for (let i = 0; i < menu_images.length; i++) {
                                const image = await sharp(menu_images[i]);
                                const metadata = await image.metadata();
                                const webpPath = menu_images[i].replace(metadata.format, 'webp');
                                await image
                                    .resize()
                                    .webp({ quality: 80 })
                                    .toFormat('webp')
                                    .toFile(webpPath);
                                await pool.query(insertImageQuery, [menuId, webpPath]);
                                
                                if (i === 0) {
                                    const updateQuery = 'UPDATE menus SET restro_image = ? WHERE id = ?';
                                    await pool.query(updateQuery, [webpPath, menuId]);
                                }
                                fs.unlinkSync(menu_images[i]); 


                            }
                        }
                        

                        
                       
                        resolve(updateResults);
                    } catch (insertionError) {
                        reject(insertionError);
                    }
                }
            });
        });

        req.flash('success', 'Data Updated');
        return res.redirect('/admin/menu-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/menu-edit/${menuId}`);
    }
}




const Delete = async(req,res)=>{
    try {
        const menuId = req.params.menuId;

        const softDeleteQuery = 'UPDATE menus SET deleted_at = NOW() WHERE id = ?';

        pool.query(softDeleteQuery, [menuId], (error, result) => {
            if (error) {
                console.error(error);
                return req.flash('success','Internal server error');
            }
        });

        req.flash('success','Menu soft deleted successfully');
        return res.redirect('/admin/menu-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/menu-list`);
    }
}


const Restore = async(req,res)=>{
    try {
        const menuId = req.params.menuId;

        const RestoreQuery = 'UPDATE menus SET deleted_at = null WHERE id = ?';

        pool.query(RestoreQuery, [menuId], (error, result) => {
            if (error) {
                console.error(error);
                return req.flash('success','Internal server error');
            }
        });

        req.flash('success','Menu Restored successfully');
        return res.redirect('/admin/menu-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/menu-list`);
    }
}

const PermanentDelete = async(req,res)=>{
    try {
        const menuId = req.params.menuId;

     

        const DeleteQuery = 'DELETE FROM menus WHERE id = ?';

        pool.query(DeleteQuery, [menuId], (error, result) => {
            if (error) {
                console.error(error);
                return req.flash('success','Internal server error');
            }
        });


        req.flash('success','Menu deleted successfully');
        return res.redirect('/admin/menu-list');
    } catch (error) {
        req.flash('error', error.message);
        return res.redirect(`/admin/menu-list`);
    }
}



module.exports = {Create,List,Store,Edit,Update,Delete,Restore,PermanentDelete};
