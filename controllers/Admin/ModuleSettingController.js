
const pool = require('../../db/database');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');

const {validateRequiredFields} = require('../../helpers/validationsHelper');

function capitalizeString(str) {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const Edit = async(req,res)=>{
    try {
        const module_settingsId = 1; 
     
        const getmodule_settingsQuery = 'SELECT * FROM module_settings WHERE id = ?';
        const module_settings = await new Promise((resolve, reject) => {
            pool.query(getmodule_settingsQuery, [module_settingsId], function (error, result) {
                if (error) {
                    console.error(error);
                    req.flash('error', error.message);
                    reject(error);
                } else {
                    resolve(result[0]);
                }
            });
        });

        const segments = req.url.split('/');
        const currentURL = segments[2];

        
        const formattedURL = capitalizeString(currentURL.replace(/_/g, ' '));

        console.log(formattedURL);

        
        res.render('admin/module_settings/create', {
            success: req.flash('success'),
            error: req.flash('error'),
            module_settings: module_settings,
            form_url: '/admin/module_settings/update',
            page_name: formattedURL
        });
    } catch (error) {
        return  req.flash('error', error.message);
    }

}


const Update = async (req, res) => {
    try {
        const { meta_title, meta_description, meta_keywords,about_description,privacy_policy,terms_condition,
                 email, mobile, address,whatsapp,instagram,youtube,facebook,contact_detail,
                 return_refund,cancellation,why_choose_us,fcm_server_key } = req.body;

        
        const query = `
            UPDATE module_settings 
            SET 
                about_us_title = COALESCE(?, about_us_title),
                about_us_descriptions = COALESCE(?, about_us_descriptions),
                about_us_keywords = COALESCE(?, about_us_keywords),
                about_us = COALESCE(?, about_us),
                privacy_policy = COALESCE(?, privacy_policy),
                terms_condition = COALESCE(?, terms_condition),
                email = COALESCE(?, email),
                mobile = COALESCE(?, mobile),
                address = COALESCE(?,  address),
                whatsapp = COALESCE(?,  whatsapp),
                instagram = COALESCE(?,  instagram),
                youtube = COALESCE(?,  youtube),
                facebook = COALESCE(?,  facebook),
                contact_us = COALESCE(?,  contact_us),
                return_refund = COALESCE(?,  return_refund),
                cancellation = COALESCE(?,  cancellation),
                why_choose_us = COALESCE(?,  why_choose_us),
                fcm_server_key = COALESCE(?,  fcm_server_key)
            WHERE id = ?`;

        
        const values = [meta_title,meta_description,meta_keywords,about_description,privacy_policy,terms_condition,
                        email, mobile, address,whatsapp,instagram,youtube,facebook,contact_detail,return_refund,cancellation,why_choose_us,fcm_server_key, 1]; 

        
        await pool.query(query, values);

        return res.json({
            status: true,
            msg: 'Settings Updated successfully'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = {Edit,Update};
