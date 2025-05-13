const util = require('util');
const pool = require('../db/database');
const multer = require('multer');

const queryAsync = util.promisify(pool.query).bind(pool);
const apiURL = 'https://api.matchmakers.world/';

async function fetchCustomerDetails(customerId) {

	try {
		const rows = await queryAsync('SELECT * FROM customer_details WHERE customer_id = ?', [customerId]);
		if (rows.length > 0) {
			const customer = rows[0];
		
			return customer;
		} else {
			console.log('Customer not found');
			return null;
		}
	} catch (error) {
		console.error('Error fetching customer details:', error);
		throw error;
	}
}

async function fetchPartnerDetails(customerId) {
	try {
		const rows = await queryAsync('SELECT * FROM partner_details WHERE customer_id = ?', [customerId]);
		if (rows.length > 0) {
			const customer = rows[0];
		
			return customer;
		} else {
			console.log('Customer not found');
			return null;
		}
	} catch (error) {
		console.error('Error fetching partner details:', error);
		throw error;
	}
}



async function constructAboutData(customerDetail) {

	try {
		
		const aboutData = {
			first_name: customerDetail.first_name,
			last_name: customerDetail.last_name,
			phone: customerDetail.mobile,
			email: customerDetail.email,
			country: customerDetail.country,
			state: customerDetail.state,
			area: customerDetail.area,
			address: customerDetail.contact_address,
		};
		return aboutData;
	} catch (error) {
		console.error('Error fetching constructAboutData:', error);
		throw error;
	}
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'uploads/customer');
	},
	filename: function (req, file, cb) {
		cb(null, Date.now() + path.extname(file.originalname));
	},
});

const upload = multer({ storage: storage });

async function uploadProfileImage(req, res) {
	try {
		if (!req.file) {
			return res.status(400).json({ status: false, msg: 'No image uploaded' });
		}

		const imageUrl = req.file.path;
		const customerId = req.customer.id;

		const updateQuery = 'UPDATE customers SET profile_image = ? WHERE id = ?';
		const updateResults = await pool.query(updateQuery, [imageUrl, customerId]);

		res.json({ status: true, msg: 'File uploaded and customer profile updated successfully', imageUrl: imageUrl });
	} catch (error) {
		console.error('Error updating customer profile image:', error);
		res.status(500).json({ status: false, msg: 'Internal Server Error 1300' });
	}
}
async function updateProfileImage(customerId, imageUrl) {
	return new Promise((resolve, reject) => {
		const updateQuery = 'UPDATE customers SET profile_image = ? WHERE id = ?';
		pool.query(updateQuery, [imageUrl, customerId], (updateError, updateResults) => {
			if (updateError) {
				reject(updateError);
			} else {
				resolve(updateResults);
			}
		});
	});
}

async function updateProfileImageMultipal(customerId, imagePaths) {
    const insertQueries = imagePaths.map((imagePath) => {
        return new Promise((resolve, reject) => {
            const insertQuery = 'INSERT INTO customer_images (customer_id, path) VALUES (?, ?)';
            pool.query(insertQuery, [customerId, imagePath], (insertError, insertResults) => {
                if (insertError) {
                    reject(insertError);
                } else {
                    resolve(insertResults);
                }
            });
        });
    });

    try {
        const results = await Promise.all(insertQueries);
        return results;
    } catch (error) {
        throw error;
    }
}

async function getCustomerById(customerId) {
	return new Promise((resolve, reject) => {
		const selectQuery = 'SELECT * FROM customers WHERE id = ?';
		pool.query(selectQuery, [customerId], async (selectError, selectResults) => {
			if (selectError) {
				reject(selectError);
			} else {
				
			
				
				const detailsQuery = 'SELECT * FROM customer_details WHERE customer_id = ?';
				pool.query(detailsQuery, [customerId], (detailsError, detailsResults) => {
					if (detailsError) {
						reject(detailsError);
					} else {
						
						const sanitizedDetailsResults = detailsResults.map((detail) => {
							return Object.fromEntries(
								Object.entries(detail).map(([key, value]) => [key, value === null ? '' : value])
							);
						});

						
						const sanitizedCustomer = Object.fromEntries(
							Object.entries(selectResults[0]).map(([key, value]) => [key, value === null ? '' : value])
						);

						const get_customer_multipal_image = 'SELECT * FROM customer_images WHERE customer_id = ?';
						pool.query(get_customer_multipal_image, [customerId], (customerImageError, customerImageResults) => {
							if (customerImageError) {
								reject(customerImageError);
							} else {
								const customerImages = customerImageResults.map(image => ({
									...image,
									path: apiURL+image.path
								})) || []; 
				
								
								const customerWithDetails = {
									...sanitizedCustomer,
									customer_details: sanitizedDetailsResults,
									customer_images: customerImages, 
								};
				
								resolve(customerWithDetails);
							}
						});
					}
				});
			}
		});
	});
}

async function getCustomerDetails(customerId) {
	return new Promise((resolve, reject) => {
		const detailsQuery = 'SELECT * FROM customer_details WHERE customer_id = ?';
		pool.query(detailsQuery, [customerId], (detailsError, detailsResults) => {
			if (detailsError) {
				reject(detailsError);
			} else {
				resolve(detailsResults);
			}
		});
	});
}
async function updateProfile(customer_id, requestBody) {
	try {
		const {
			country_code,
			email,
			mobile,
			first_name,
			last_name,
			date_of_birth,
			time_of_birth,
			birth_place,
			account_for,
			language,
			gender,
			hobbies,
			interest,
			dietary,
			mother_tongue,
			religion,
			marital_status,
			cast,
			height,
			width,
			disability,
			smoking,
			drinking,
			highest_degree,
			employeement_type,
			occupation,
			company_name,
			annual_income,
			express_yourself,
			country,
			state,
			city,
			area,
			family_type,
			father_name,
			mother_name,
			no_of_brothers,
			no_of_sisters,
			married_sisters,
			married_brothers,
			parent_contact,
			contact_address,
			about_family,
			father_occupation,
			mother_occupation,
			family_status,
			family_value,
			device_key,
		} = req.body;


		console.log(req.body);

		pool.query('SELECT * FROM customers WHERE email = ?', [email], (error, emailDetails) => {
			if (error) {
				console.error('Error retrieving customer details:', error);
				return res.status(500).json({ status: false, msg: 'Internal server error. 218' });
			}

			if (emailDetails.length > 0) {
				return res.status(400).json({ status: false, msg: 'Email is already registered.' });
			}

			
			pool.query('SELECT * FROM customers WHERE mobile = ?', [mobile], (error, mobileDetails) => {
				if (error) {
					console.error('Error retrieving customer details:', error);
					return res.status(500).json({ status: false, msg: 'Internal server error. 229' });
				}

				if (mobileDetails.length > 0) {
					return res.status(400).json({ status: false, msg: 'Mobile number is already registered.' });
				}


				const languageStr = Array.isArray(language) ? language.join(',') : '';
				const hobbiesStr = Array.isArray(hobbies) ? hobbies.join(',') : '';
				const interestStr = Array.isArray(interest) ? interest.join(',') : '';
				const dietaryStr = Array.isArray(dietary) ? dietary.join(',') : '';

				
				const insertCustomerQuery = 'INSERT INTO customers (name,email, mobile, role, registration_source, registration_for, device_key,country_code) VALUES (?, ?,?,?,?,?,?,?)';
				const customerValues = [first_name + ' ' + last_name, email, mobile, 'customer', 'app', 'food_delight', device_key, country_code];

				pool.query(insertCustomerQuery, customerValues, (error, results) => {
					if (error) {
						console.error('Error inserting data:', error);
						return res.status(500).json({ status: false, msg: 'Internal server error.23' });
					}

					const lastInsertedCustomerId = results.insertId;
					const age = calculateAge(date_of_birth);
					const insertDetailsQuery = 'INSERT INTO customer_details (customer_id,place_of_birth,gender, first_name, last_name, email, mobile,date_of_birth,age, time_of_birth, account_for, language, hobbies, interest, dietary, mother_tongue, religion, marital_status, cast, height, width, disability, smoking, drinking, highest_degree, employeement_type, occupation, company_name, annual_income, express_yourself, country, state, city, area, family_type, father_name, mother_name, no_of_brothers, no_of_sisters, married_sisters, married_brothers, parent_contact, contact_address, about_family, father_occupation, mother_occupation, family_status, family_value) VALUES (?,?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';

					const detailsValues = [
						lastInsertedCustomerId,
						birth_place,
						gender,
						first_name,
						last_name,
						email,
						mobile,
						date_of_birth,
						age,
						time_of_birth,
						account_for,
						languageStr,
						hobbiesStr,
						interestStr,
						dietaryStr,
						mother_tongue,
						religion,
						marital_status,
						cast,
						height,
						width,
						disability,
						smoking,
						drinking,
						highest_degree,
						employeement_type,
						occupation,
						company_name,
						annual_income,
						express_yourself,
						country,
						state,
						city,
						area,
						family_type,
						father_name,
						mother_name,
						no_of_brothers,
						no_of_sisters,
						married_sisters,
						married_brothers,
						parent_contact,
						contact_address,
						about_family,
						father_occupation,
						mother_occupation,
						family_status,
						family_value
					];

					pool.query(insertDetailsQuery, detailsValues, (error, detailsResults) => {
						if (error) {
							console.error('Error inserting customer details:', error);
							return res.status(500).json({ status: false, msg: 'Internal server error.280' });
						}

						
						pool.query('SELECT * FROM customer_details WHERE id = ?', [detailsResults.insertId], (error, customerDetails) => {
							if (error) {
								console.error('Error retrieving customer details:', error);
								return res.status(500).json({ status: false, msg: 'Internal server error. 317' });
							}

							return res.status(200).json({ status: true, msg: 'Customer registered successfully', customer_details: customerDetails[0] });
						});
					});
				});
			});
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ status: false, msg: 'Internal server error.328' });
	}
}

function calculateAge(dateOfBirth) {
	const today = new Date();
	const birthDate = new Date(dateOfBirth);
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDiff = today.getMonth() - birthDate.getMonth();

	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}

	return age;
}

module.exports = { fetchCustomerDetails, fetchPartnerDetails, constructAboutData, updateProfileImage, getCustomerById, getCustomerDetails, updateProfile,updateProfileImageMultipal  };