function checkStatusAndDeletedAt(req, res, next) {
	const { status, deleted_at } = req.body; 

	
	if (status === 1 && deleted_at === null) {
		
		next();
	} else {
		
		const errorMessage = 'Invalid status or deleted_at value.';
		console.error(errorMessage);

		

		
		res.status(403).json({ status: false, msg: errorMessage });
	}
}

module.exports = checkStatusAndDeletedAt;