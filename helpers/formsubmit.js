function submitForm(formId, url, successMessage, errorMessage) {
    const form = document.getElementById(formId);
    const errorContainer = document.createElement('div');
    errorContainer.classList.add('alert', 'alert-danger');
    errorContainer.style.display = 'none';
    form.parentNode.insertBefore(errorContainer, form.nextSibling);

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = new FormData(this);

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.message || 'Internal server error');
            }

            alert(successMessage);
            window.location.reload(); 
        } catch (error) {
            errorContainer.innerHTML = ''; 

            if (responseData && responseData.errors) {
                responseData.errors.forEach(error => {
                    const errorMessageElement = document.createElement('p');
                    errorMessageElement.textContent = error.message;
                    errorContainer.appendChild(errorMessageElement);
                });
            } else {
                const errorMessageElement = document.createElement('p');
                errorMessageElement.textContent = error.message;
                errorContainer.appendChild(errorMessageElement);
            }

            errorContainer.style.display = 'block'; 
        }
    });
}
