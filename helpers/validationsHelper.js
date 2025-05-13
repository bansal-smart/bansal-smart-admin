function validateRequiredFields(req, res, fields) {
    const errors = [];

    fields.forEach(field => {
        if (!req.body[field]) {
            errors.push({ field: field, message: `${field.charAt(0).toUpperCase() + field.slice(1)} is required` });
        }
    });

    return errors;
}

function getLogoutUrl(user) {
    console.log(res.locals.userRole)
    if (!user || !user.role) return '/restaurant/login'; // Default redirect if user is not defined
    return user.role === 'Admin' ? '/admin/logout' : '/restaurant/logout';
}

function getDashboardUrl(user) {
  
    if (!user || !user.role) return '/restaurant/login';
    return user.role === 'Admin' ? '/admin/dashboard' : '/restaurant/dashboard';
}

module.exports = {
    validateRequiredFields,
    getLogoutUrl,
    getDashboardUrl,
};
