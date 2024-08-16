document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const params = new URLSearchParams(window.location.search);
    const contactId = params.get("id");
    const errorMessageDiv = document.getElementById("error-message");

    if (!token || !contactId) {
        window.location.href = "login.html";
        return;
    }

    try {
        // Fetch existing contact details
        const response = await fetch(`/api/contacts/${contactId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Failed to fetch contact details.");
        }

        const contact = await response.json();
        document.getElementById("username").value = contact.name;
        document.getElementById("email").value = contact.email;
        document.getElementById("phone").value = contact.phone;

    } catch (error) {
        console.error(error);
        errorMessageDiv.textContent = "Failed to load contact details.";
    }

    // Handle form submission
    document.getElementById("updateContactForm").addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData();
        formData.append("name", document.getElementById("username").value);
        formData.append("email", document.getElementById("email").value);
        formData.append("phone", document.getElementById("phone").value);
        const photoInput = document.getElementById("photo");
        if (photoInput.files.length > 0) {
            formData.append("photo", photoInput.files[0]);
        }

        try {
            const response = await fetch(`/api/contacts/${contactId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                errorMessageDiv.textContent = errorData.message || "Failed to update contact.";
                throw new Error("Failed to update contact.");
            }

            alert("Contact updated successfully!");
            window.location.href = "dashboard.html"; 

        } catch (error) {
            console.error(error);
            errorMessageDiv.textContent = "Failed to update contact.";
        }
    });
});
