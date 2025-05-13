const util = require('util');
const pool = require('../db/database');

const queryAsync = util.promisify(pool.query).bind(pool);



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
            SELECT id, title, short_description, image
            FROM stories
            WHERE status = 1 AND deleted_at IS NULL
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

		if (customerHobbiesResult.length === 0 || customerHobbiesResult[0].hobbies === null) {
			throw new Error('Customer hobbies not found.');
		}

		const customerHobbies = customerHobbiesResult[0].hobbies.split(',').map(Number);

		const eventsQuery = 'SELECT id, title, image, banner_image, start_date, end_date, start_time, end_time, city FROM events WHERE status = 1 AND deleted_at IS NULL ORDER BY created_at DESC';
		const successStoriesQuery = 'SELECT id, title, short_description, image FROM stories WHERE status = 1 AND deleted_at IS NULL ORDER BY created_at DESC';

		const customersQuery = `SELECT
    customers.id,
    customers.name,
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
    MAX(customers.profile_image) as profile_image
FROM customers
LEFT JOIN customer_details ON customers.id = customer_details.customer_id
LEFT JOIN cities AS city ON city.city_id = customer_details.city
LEFT JOIN states AS state ON state.state_id = customer_details.state
LEFT JOIN countries AS country ON country.country_id = customer_details.country
WHERE customers.role = ? AND customers.registration_for = ?
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
        country.name as country_name,
        state.name as state_name,
        city.city as city_name,
        customer_details.occupation as occupation,
        customers.profile_image,
        customers.is_premium
    FROM customers
    LEFT JOIN customer_details ON customers.id = customer_details.customer_id
    LEFT JOIN cities AS city ON city.city_id = customer_details.city
    LEFT JOIN states AS state ON state.state_id = customer_details.state
    LEFT JOIN countries AS country ON country.country_id = customer_details.country
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



		const match = allCustomers
			.filter(customer => customer.hobbies !== null && customer.customer_id !== 42623)
			.filter(customer => {
				const customerHobbiesArray = customer.hobbies.split(',').map(Number);
				return customerHobbies.every(hobby => customerHobbiesArray.includes(hobby));
			});

		console.log('All Customers:', allCustomers.length);
		console.log('Filtered Customers:', match.length);
		return { events, success_stories, match, premium_customer };
	} catch (error) {
		console.error('Error fetching events, success stories, and customers:', error);
		throw error;
	}
}


async function sendRequestApi(customer_id, receiver_id) {
	try {
		const checkQuery = 'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?';
		const checkParams = [customer_id, receiver_id];
		const existingRequest = await queryAsync(checkQuery, checkParams);

		if (existingRequest.length > 0) {
			throw new Error('Friend request already sent.');
		}

		const insertQuery = 'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, ?)';
		const insertParams = [customer_id, receiver_id, 0];

		await queryAsync(insertQuery, insertParams);

		return { success: true, message: 'Friend request sent successfully.' };
	} catch (error) {
		console.error('Error sending friend request:', error);
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
		const query = `SELECT id , title, short_description, image, description FROM stories WHERE id = ? ORDER BY created_at DESC`;

		const rows = await queryAsync(query, [req.body.story_id]);



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

async function getNotificationList() {
	try {
		const query = `
            SELECT id, title, description, image
            FROM notifications
        `;

		const rows = await queryAsync(query);
		return rows;
	} catch (error) {
		throw error;
	}
}

module.exports = { getCustomersList, getSuccessStoryList, getHomeApiList, sendRequestApi, getCustomerDetailsApi, doesCustomerExist, getSuccessStoryDetails, getNotificationList };
