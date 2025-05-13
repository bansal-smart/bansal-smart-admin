const util = require('util');
const pool = require('../db/database');

const queryAsync = util.promisify(pool.query).bind(pool);
const apiURL = 'http://localhost:5000/'

async function getCustomersList(req_data) {
	console.log(req_data);
	try {
		let query = `SELECT
            customers.id,
            customers.name,
            customer_details.*,
            country.name as country_name,
            state.name as state_name,
            city.city as city_name
        FROM customers
        LEFT JOIN customer_details ON customers.id = customer_details.customer_id
        LEFT JOIN cities AS city ON city.city_id = customer_details.city
        LEFT JOIN states AS state ON state.state_id = customer_details.state
        LEFT JOIN countries AS country ON country.country_id = customer_details.country
        WHERE customers.role = ? AND customers.registration_for = ?`;

		const queryParams = ['customer', 'food_delight'];

		
		if (req_data.fromAge && req_data.toAge) {
			query += ` AND customer_details.age BETWEEN ? AND ?`;
			queryParams.push(parseInt(req_data.fromAge), parseInt(req_data.toAge));
		} else if (req_data.age) {
			query += ` AND customer_details.age = ?`;
			queryParams.push(parseInt(req_data.age));
		}

		
		if (req_data.fromHeight && req_data.toHeight) {
			
			const fromHeight = parseFloat(req_data.fromHeight);
			const toHeight = parseFloat(req_data.toHeight);

			if (fromHeight <= toHeight) {
				query += ` AND customer_details.height BETWEEN ? AND ?`;
				queryParams.push(fromHeight, toHeight);
			} else {
				
				query += ` AND customer_details.height BETWEEN ? AND ?`;
				queryParams.push(toHeight, fromHeight);
			}
		} else if (req_data.height) {
			
			query += ` AND customer_details.height = ?`;
			queryParams.push(parseFloat(req_data.height));
		}

		
		if (req_data.marital_status) {
			query += ` AND customer_details.marital_status = ?`;
			queryParams.push(req_data.marital_status);
		}

		
		if (req_data.mother_tongue) {
			query += ` AND customer_details.mother_tongue = ?`;
			queryParams.push(req_data.mother_tongue);
		}

		
		if (req_data.religion) {
			query += ` AND customer_details.religion = ?`;
			queryParams.push(req_data.religion);
		}

		
		if (req_data.cast) {
			query += ` AND customer_details.cast = ?`;
			queryParams.push(req_data.cast);
		}

		
		if (req_data.education) {
			query += ` AND customer_details.highest_degree = ?`;
			queryParams.push(req_data.education);
		}
		query += ` ORDER BY customers.created_at DESC`;

		console.log('Final Query:', query);
		console.log('Query Params:', queryParams);

		const rows = await queryAsync(query, queryParams);

		if (rows.length > 0) {
			return { status: true, data: rows };
		} else {
			return { status: false, msg: 'No customers found based on the specified criteria.' };
		}
	} catch (error) {
		console.error('Error fetching customer details:', error);
		throw error;
	}
}

async function getSuccessStoryList() {
	try {
		const query = `
            SELECT s.id, s.title, s.short_description,
                   COALESCE((
                       SELECT si.image
                       FROM story_image si
                       WHERE si.story_id = s.id
                       ORDER BY si.created_at DESC
                       LIMIT 1
                   ), 'uploads/No-image-found.jpg') AS story_image_url
            FROM stories s
            WHERE s.status = 1 AND s.deleted_at IS NULL
        `;

		const rows = await queryAsync(query);
		return rows;
	} catch (error) {
		throw error;
	}
}


async function getHomeApiList(profile) {
	try {
		console.log("In Modal : " + profile.id);
		const profile_id = profile.id;

		
		const customerHobbiesQuery = 'SELECT hobbies FROM customer_details WHERE customer_id = ?';
		const customerHobbiesResult = await queryAsync(customerHobbiesQuery, [profile_id]);

		
		
		

		if(customerHobbiesResult.length  > 0){
			
			const customerHobbies = customerHobbiesResult[0].hobbies.split(',').map(Number);
		}else{
			const customerHobbies = "";
		}
		
		const eventsQuery = 'SELECT id, title, image, banner_image, start_date, end_date, start_time, end_time, city,created_at FROM events WHERE status = 1 AND deleted_at IS NULL ORDER BY created_at DESC';
		const successStoriesQuery = 'SELECT id, title, short_description, image FROM stories WHERE status = 1 AND deleted_at IS NULL ORDER BY created_at DESC';

		const customersQuery = `SELECT
    customers.id,
    customers.name,
	customers.created_at,
    MAX(customer_details.date_of_birth) as date_of_birth,
    MAX(customer_details.age) as age,
    MAX(customer_details.country) as country,
    MAX(customer_details.state) as state,
    MAX(customer_details.city) as city,
    MAX(customer_details.hobbies) as hobbies,
    MAX(country.name) as country_name,
    MAX(state.name) as state_name,
    MAX(city.city) as city_name,
    MAX(customer_details.occupation) as occupation,
    MAX(customer_details.religion) as religion,
    MAX(customer_details.cast) as cast,
    MAX(customer_details.height) as height,
    MAX(customer_details.width) as width,
    MAX(rel.title) as religion_name,
    MAX(cast.title) as cast_name,
    MAX(customers.profile_image) as profile_image
	
FROM customers
LEFT JOIN customer_details ON customers.id = customer_details.customer_id
LEFT JOIN cities AS city ON city.city_id = customer_details.city
LEFT JOIN states AS state ON state.state_id = customer_details.state
LEFT JOIN countries AS country ON country.country_id = customer_details.country
LEFT JOIN religion AS rel ON rel.id = customer_details.religion
LEFT JOIN cast AS cast ON cast.id = customer_details.cast

WHERE customers.role = ? AND customers.registration_for = ? AND customers.id != ?
GROUP BY customers.id, customers.name
ORDER BY customers.created_at DESC;`;
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		
		


		const premiumCustomerQuery = `
    SELECT DISTINCT
        customers.id,
        customers.name,
        customer_details.date_of_birth,
        customer_details.age,
        customer_details.country,
        customer_details.state,
        customer_details.city,
        customer_details.religion,
        customer_details.cast,
        customer_details.height,
        customer_details.width,
        country.name as country_name,
        state.name as state_name,
        city.city as city_name,
        customer_details.occupation as occupation,
        customers.profile_image,
        customers.is_premium,
		customers.created_at,
		rel.title as religion_name,
		cast.title as cast_name
    FROM customers
    LEFT JOIN customer_details ON customers.id = customer_details.customer_id
    LEFT JOIN cities AS city ON city.city_id = customer_details.city
    LEFT JOIN states AS state ON state.state_id = customer_details.state
    LEFT JOIN countries AS country ON country.country_id = customer_details.country
    LEFT JOIN religion AS rel ON rel.id = customer_details.religion
    LEFT JOIN cast AS cast ON cast.id = customer_details.cast
    WHERE customers.role = ? AND customers.registration_for = ? AND customers.is_premium = 1 AND customers.id != ?
    ORDER BY customers.created_at DESC;`;



		const params = ['customer', 'food_delight', profile_id];
		const queryParameters = [profile_id];
		const [events, success_stories, allCustomers, premium_customer] = await Promise.all([
			queryAsync(eventsQuery),
			queryAsync(successStoriesQuery),
			queryAsync(customersQuery, params),
			queryAsync(premiumCustomerQuery, params),
		]);

		
		

		

		
		const fetchAndAppendImages = async (customers) => {
			const customersWithImages = await Promise.all(customers.map(async (customer) => {
				const customerImagesQuery = 'SELECT id,path FROM customer_images WHERE customer_id = ?';
				const customerImages = await queryAsync(customerImagesQuery, [customer.id]);

				
				customer.customer_images = customerImages.map((image) => ({
					...image,
					path: apiURL + image.path,
				}));

				
				const friendrequest = 'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?';
                 const friendrequestparms = [profile_id,customer.id];
				 const getRequestData = await queryAsync(friendrequest,friendrequestparms);
				 if (getRequestData.length > 0) {
					customer.is_friend_request_status = getRequestData[0].status.toString();;
				 }else{
					customer.is_friend_request_status = "";
				 }

				return customer;
			}));

			return customersWithImages;
		};

		
					
			const allCustomersWithImages = await fetchAndAppendImages(allCustomers);

			
			let premiumCustomersWithImages;
			
			
				premiumCustomersWithImages = await fetchAndAppendImages(premium_customer);

			const match = allCustomersWithImages
				.filter(customer => customer.hobbies !== null && customer.id !== 42623) 
				.filter(customer => {
					const customerHobbiesArray = customer.hobbies.split(',').map(Number);
					return customerHobbiesArray.every(hobby => customerHobbiesArray.includes(hobby));
				});

			console.log('All Customers:', allCustomersWithImages.length);
		console.log('Filtered Customers:', match.length);

		return { events, success_stories, match, premiumCustomersWithImages };
	} catch (error) {
		console.error('Error fetching events, success stories, and customers:', error);
		throw error;
	}
}


async function deleteData(tableName, conditions) {
    try {
        
        const sql = `DELETE FROM ${tableName} WHERE ${conditions}`;

		console.log("SQL delete" +sql);
        
        const result = await queryAsync(sql);

        
        return result;
    } catch (error) {
        
        console.error("Error in deleteData:", error);
        throw error;
    }
}

async function sendRequestApi(customer_id, receiver_id) {
	try {
		
		const checkQuery = 'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?';
		const checkParams = [customer_id, receiver_id];
		const existingRequest = await queryAsync(checkQuery, checkParams);

		if (existingRequest.length > 0) {
					
				const parmsfriend = 'sender_id = '+customer_id+' AND receiver_id = '+receiver_id;

				await deleteData('friend_requests',parmsfriend);

				return { success: true, message: 'Request Remove successfully.' };
		}else{
				
			const insertQuery = 'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, ?)';
			const insertParams = [customer_id, receiver_id, 0];

			await queryAsync(insertQuery, insertParams);

			return { success: true, message: 'Friend request sent successfully.' };
		}

		
	} catch (error) {
		console.error('Error sending friend request:', error);
		throw error;
	}
}


async function respondRequestApi(my_id, sender_id, response) {
	try {
		
		const checkQuery = 'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?';
		const checkParams = [sender_id, my_id];
		const existingRequest = await queryAsync(checkQuery, checkParams);

		if (existingRequest.length === 0) {
			throw new Error('Friend request not found.');
		}

		const currentStatus = existingRequest[0].status;

		
		if (currentStatus === 1) {
			return { success: true, message: 'Friend request has already been accepted.' };
		} else if (currentStatus === 2) {
			return { success: true, message: 'Friend request has already been rejected.' };
		}

		
		const updateQuery = 'UPDATE friend_requests SET status = ? WHERE sender_id = ? AND receiver_id = ?';
		const updateParams = [response === 'accept' ? 1 : 2, sender_id, my_id];

		await queryAsync(updateQuery, updateParams);

		return { success: true, message: `Friend request ${response}ed successfully.` };
	} catch (error) {
		console.error('Error responding to friend request:', error);
		throw error;
	}
}

async function fetchCustomermultipalprofile(customer_id) {
	const customerImagesQuery = 'SELECT id,path FROM customer_images WHERE customer_id = ?';
		const customerImages = await queryAsync(customerImagesQuery, [customer_id]);

		if(customerImages.length > 0){
			const updatedCustomerImages = customerImages.map((image) => ({
				...image,
				path: apiURL + image.path,
			}));

					return updatedCustomerImages;
		}else{
			return [];
		}

}

async function fetchCustomerDetailsFromDB(sender_id) {
	const query = `SELECT
						customers.id,
						customers.name,
						customers.created_at,
						MAX(customer_details.date_of_birth) as date_of_birth,
						MAX(customer_details.age) as age,
						MAX(customer_details.country) as country,
						MAX(customer_details.state) as state,
						MAX(customer_details.city) as city,
						MAX(customer_details.hobbies) as hobbies,
						MAX(country.name) as country_name,
						MAX(state.name) as state_name,
						MAX(city.city) as city_name,
						MAX(customer_details.occupation) as occupation,
						MAX(customer_details.religion) as religion,
						MAX(customer_details.cast) as cast,
						MAX(customer_details.height) as height,
						MAX(customer_details.width) as width,
						MAX(rel.title) as religion_name,
						MAX(cast.title) as cast_name,
						MAX(customers.profile_image) as profile_image
						
					FROM customers
					LEFT JOIN customer_details ON customers.id = customer_details.customer_id
					LEFT JOIN cities AS city ON city.city_id = customer_details.city
					LEFT JOIN states AS state ON state.state_id = customer_details.state
					LEFT JOIN countries AS country ON country.country_id = customer_details.country
					LEFT JOIN religion AS rel ON rel.id = customer_details.religion
					LEFT JOIN cast AS cast ON cast.id = customer_details.cast

					WHERE customers.id = ?
					GROUP BY customers.id, customers.name
					ORDER BY customers.created_at DESC;`;

		const rows = await queryAsync(query,[sender_id]);
		rows[0].customer_images = await fetchCustomermultipalprofile(rows[0].id);
       return rows;
}



async function friendlistrequest(my_id,status) {
	try {
		const request_query = `Select * From friend_requests 
		                        WHERE friend_requests.receiver_id = ? AND friend_requests.status = ? GROUP BY sender_id`;

		const request_parms = [my_id,status];
		
		console.log(request_parms);
		 const execute_request_list = await queryAsync(request_query, request_parms);
             
		 console.log("friend Request length"+execute_request_list.length);

		 if(execute_request_list.length > 0){
			for (const request of execute_request_list) {
				const sender_id = request.sender_id;

				
				const customerDetails = await fetchCustomerDetailsFromDB(sender_id);
		
				if (customerDetails) {
					
					request.sender_details = customerDetails;
				}else{
					request.sender_details = [];
				}

			}
		 }
			 return execute_request_list;
		
		 
           
	} catch (error) {
		console.error('Error responding to friend request:', error);
		throw error;
	}

}

async function getCustomerDetailsApi(req) {
	console.log(req.body.customer_id);

	try {
		const query = `
            SELECT DISTINCT
                customers.id,
                customers.name,
                customer_details.*,
                country.name as country_name,
                state.name as state_name,
                city.city as city_name,
                religion.title as religion_name,
                customer_details.marital_status,
                GROUP_CONCAT(language.title) as language_list,
                customer_details.hobbies,
                GROUP_CONCAT(hobbies.title) as hobby_list,
                customer_details.interest,
                GROUP_CONCAT(interest.title) as interest_list,
                customer_details.dietary,
                GROUP_CONCAT(dietary_preference.title) as dietarys,
                cast.title as cast_name
            FROM
                customers
            LEFT JOIN
                customer_details ON customers.id = customer_details.customer_id
            LEFT JOIN
                cities AS city ON city.city_id = customer_details.city
            LEFT JOIN
                states AS state ON state.state_id = customer_details.state
            LEFT JOIN
                countries AS country ON country.country_id = customer_details.country
            LEFT JOIN
                religion ON customer_details.religion = religion.id
            LEFT JOIN
                cast ON customer_details.cast = cast.id
            LEFT JOIN
                language ON FIND_IN_SET(language.id, customer_details.language)
            LEFT JOIN
                hobbies ON FIND_IN_SET(hobbies.id, customer_details.hobbies)
            LEFT JOIN
                interest ON FIND_IN_SET(interest.id, customer_details.interest)
            LEFT JOIN
                dietary_preference ON FIND_IN_SET(dietary_preference.id, customer_details.dietary)
            WHERE
                customers.id = ?
            ORDER BY
                customers.created_at DESC`;

		const rows = await queryAsync(query, [req.body.customer_id]);



		if (rows.length === 0) {
			
			console.log('Customer not found.');
			return null;  
		}

		return rows;
	} catch (error) {
		console.error('Error fetching customer details:', error);
		throw error;
	}
}

async function doesCustomerExist(customer_id) {
	try {
		
		if (!customer_id || !customer_id) {
			return false;
		}	

		

		const query = `
            SELECT *
            FROM customers
            WHERE id = ?`;

		const rows = await queryAsync(query, [customer_id]);

		return rows.length > 0;
	} catch (error) {
		console.error('Error checking if customer exists:', error);
		throw error;
	}
}

async function getSuccessStoryDetails(req) {
	try {
		const query = `
            SELECT s.id, s.title, s.short_description, s.image AS story_image, s.description,
                   si.image AS story_image_url
            FROM stories s
            LEFT JOIN story_image si ON s.id = si.story_id
            WHERE s.id = ?
            ORDER BY si.created_at DESC
        `;

		const rows = await queryAsync(query, [req.body.story_id]);

		if (rows.length === 0) {
			
			console.log('Story not found.');
			return null;  
		}

		
		const images = rows.map(row => (row.story_image_url !== null ? row.story_image_url : 'uploads/No-image-found.jpg')).filter(url => url !== null);

		const data = {
			id: rows[0].id,
			title: rows[0].title,
			short_description: rows[0].short_description,
			story_image: rows[0].story_image !== null ? rows[0].story_image : 'uploads/No-image-found.jpg',
			description: rows[0].description,
			story_image_url: rows[0].story_image_url !== null ? rows[0].story_image_url : 'uploads/No-image-found.jpg',
			images: images.length > 0 ? images : ['uploads/No-image-found.jpg'],
		};

		return { data };
	} catch (error) {
		console.error('Error fetching story details:', error);
		throw error;
	}
}

const moment = require('moment');

async function getNotificationList(profile_id) {
	try {
		const query = `
            SELECT title, description, image, created_at
            FROM notifications
            WHERE customer_id = ?
			AND deleted_at IS NULL
            ORDER BY id DESC
        `;

		const rows = await queryAsync(query, [profile_id.id]);

		
		const formattedRows = rows.map(row => ({
			...row,
			created_at: moment(row.created_at).format('DD-MM-YYYY hh:mm:ss A')
		}));

		return formattedRows;
	} catch (error) {
		throw error;
	}
}

async function softDeleteNotification(profile_id) {
	try {
		const updateQuery = `
      UPDATE notifications
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE customer_id = ?
    `;

		await queryAsync(updateQuery, [profile_id]);
		return { success: true, message: 'Notification soft-deleted successfully.' };
	} catch (error) {
		throw error;
	}
}




async function sendFeedBackApi(customer_id, rating, feedback) {
	try {
		
		const checkQuery = 'SELECT id, rating, feedback, created_at as feedback_time FROM feedback WHERE customer_id = ?';
		const checkParams = [customer_id];
		const existingFeedback = await queryAsync(checkQuery, checkParams);

		let updatedFeedback;
		let isUpdate = false;

		
		if (existingFeedback.length > 0) {
			const updateQuery = 'UPDATE feedback SET rating = ?, feedback = ? WHERE customer_id = ?';
			const updateParams = [rating, feedback, customer_id];

			await queryAsync(updateQuery, updateParams);

			
			updatedFeedback = await queryAsync(checkQuery, checkParams);
			isUpdate = true;

			
			const feedbackHistoryQuery = 'INSERT INTO feedback_history (customer_id, feedback_id, rating, feedback, feedback_time) VALUES (?, ?, ?, ?, ?)';
			const feedbackHistoryParams = [customer_id, existingFeedback[0].id, existingFeedback[0].rating, existingFeedback[0].feedback, moment().format('YYYY-MM-DD HH:mm:ss')];
			await queryAsync(feedbackHistoryQuery, feedbackHistoryParams);
		} else {
			
			const insertQuery = 'INSERT INTO feedback (customer_id, rating, feedback) VALUES (?, ?, ?)';
			const insertParams = [customer_id, rating, feedback];

			await queryAsync(insertQuery, insertParams);

			
			updatedFeedback = await queryAsync(checkQuery, checkParams);
		}

		
		updatedFeedback[0].feedback_time = moment(updatedFeedback[0].feedback_time).format('YYYY-MM-DD hh:mm:ss A');

		
		const successMessage = isUpdate ? 'Feedback updated successfully.' : 'Feedback inserted successfully.';
		const totalUpdates = isUpdate ? existingFeedback.length : 1;

		return updatedFeedback[0];
	} catch (error) {
		console.error('Error updating/inserting feedback:', error);
		throw error;
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

						
						const customerWithDetails = { ...sanitizedCustomer, customer_details: sanitizedDetailsResults };
						resolve(customerWithDetails);
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


async function reportCustomerApi(my_id, customer_id) {
	try {
		
		if (!customer_id || customer_id === '') {
			throw new Error('Invalid customer_id provided.');
		}

		
		if (my_id === customer_id) {
			throw new Error('You cannot report yourself.');
		}

		
		const reportedCustomerExists = await doesCustomerExist(customer_id);
		if (!reportedCustomerExists) {
			throw new Error('The reported customer does not exist.');
		}

		
		const existingReport = await checkExistingReport(my_id, customer_id);
		if (existingReport) {
			throw new Error('You have already reported this customer.');
		}

		

		
		const reportQuery = `
            INSERT INTO customer_reports (reporter_id, reported_customer_id, report_time)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `;

		
		await queryAsync(reportQuery, [my_id, customer_id]);

		return { success: true, message: 'Customer reported successfully.' };
	} catch (error) {
		console.error('Error reporting customer:', error);
		throw error;
	}
}

async function unreportCustomerApi(my_id, customer_id) {
	try {
		
		if (!customer_id || customer_id === '') {
			throw new Error('Invalid customer_id provided.');
		}

		
		const existingReport = await checkExistingReport(my_id, customer_id);

		if (!existingReport) {
			throw new Error('The Customer Not reported');
		}

		
		if (existingReport.is_unreported) {
			throw new Error('The report is already marked as unreported.');
		}

		

		
		const unreportQuery = `
            UPDATE customer_reports
            SET is_unreported = 1
            WHERE reporter_id = ? AND reported_customer_id = ?
        `;

		
		await queryAsync(unreportQuery, [my_id, customer_id]);

		return { success: true, message: 'Customer unreported successfully.' };
	} catch (error) {
		console.error('Error unreporting customer:', error);
		throw error;
	}
}


async function checkExistingReport(reporter_id, reported_customer_id) {
	const reportQuery = 'SELECT id, is_unreported FROM customer_reports WHERE reporter_id = ? AND reported_customer_id = ?';
	const reportRows = await queryAsync(reportQuery, [reporter_id, reported_customer_id]);
	return reportRows.length > 0 ? reportRows[0] : null;
}


async function doesCustomerExist(customer_id) {
	const customerQuery = 'SELECT id FROM customers WHERE id = ?';
	const customerRows = await queryAsync(customerQuery, [customer_id]);
	return customerRows.length > 0;
}


async function checkExistingReport(reporter_id, reported_customer_id) {
	const reportQuery = 'SELECT id FROM customer_reports WHERE reporter_id = ? AND reported_customer_id = ?';
	const reportRows = await queryAsync(reportQuery, [reporter_id, reported_customer_id]);
	return reportRows.length > 0;
}
async function favoriteDislikeApi(loggedInCustomerId, targetCustomerId) {
	try {
		
		if (!loggedInCustomerId || loggedInCustomerId === '' || !targetCustomerId || targetCustomerId === '') {
			throw new Error('Invalid customer IDs provided.');
		}

		
		const targetCustomerExists = await doesCustomerExist(targetCustomerId);
		if (!targetCustomerExists) {
			throw new Error('The target customer does not exist.');
		}

		
		const existingAction = await checkExistingCustomerAction(loggedInCustomerId, targetCustomerId);

		if (existingAction) {
			
			const deleteQuery = 'DELETE FROM customer_likes WHERE customer_id = ? AND liked_customer_id = ?';
			await queryAsync(deleteQuery, [loggedInCustomerId, targetCustomerId]);

			return { success: true, message: 'Customer unliked successfully.' };
		} else {
			
			const insertQuery = 'INSERT INTO customer_likes (customer_id, liked_customer_id) VALUES (?, ?)';
			await queryAsync(insertQuery, [loggedInCustomerId, targetCustomerId]);

			return { success: true, message: 'Customer liked successfully.' };
		}
	} catch (error) {
		console.error('Error performing customer action:', error);
		throw error;
	}
}

async function doesCustomerExist(customerId) {
	try {
		const customerQuery = 'SELECT id FROM customers WHERE id = ?';
		const customerRows = await queryAsync(customerQuery, [customerId]);
		return customerRows.length > 0;
	} catch (error) {
		console.error('Error checking if customer exists:', error);
		throw error;
	}
}

async function checkExistingCustomerAction(loggedInCustomerId, targetCustomerId) {
	try {
		const actionQuery = 'SELECT * FROM customer_likes WHERE customer_id = ? AND liked_customer_id = ?';
		const actionRows = await queryAsync(actionQuery, [loggedInCustomerId, targetCustomerId]);
		return actionRows.length > 0 ? { like: actionRows[0].like } : null;
	} catch (error) {
		console.error('Error checking existing customer action:', error);
		throw error;
	}
}
async function deleteAccountApi(my_id, reason) {
	try {
		
		if (!my_id || isNaN(my_id)) {
			throw new Error('Invalid customer_id provided.');
		}

		
		const deleteQuery = `
            UPDATE customers
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
		const insertDeletionInfoQuery = 'INSERT INTO deleted_customers_info (customer_id, reason) VALUES (?, ?)';

		
		await queryAsync('START TRANSACTION');

		try {
			
			await queryAsync(deleteQuery, [my_id]);

			
			await queryAsync(insertDeletionInfoQuery, [my_id, reason]);

			
			await queryAsync('COMMIT');

			return { success: true, message: 'Account deleted successfully.' };
		} catch (error) {
			
			await queryAsync('ROLLBACK');
			console.error('Error executing queries:', error);
			throw error; 
		}
	} catch (error) {
		console.error('Error deleting account:', error);
		throw error;
	}
}

module.exports = { getCustomersList, getSuccessStoryList, getHomeApiList, sendRequestApi, getCustomerDetailsApi, doesCustomerExist, getSuccessStoryDetails, getNotificationList, respondRequestApi, softDeleteNotification, sendFeedBackApi, updateProfileImage, getCustomerById, getCustomerDetails, reportCustomerApi, favoriteDislikeApi, unreportCustomerApi, deleteAccountApi,friendlistrequest };
