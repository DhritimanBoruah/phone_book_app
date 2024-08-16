document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const contactsTableBody = document.getElementById("contactsTableBody");

  // Redirect to login if no token is found
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  try {
    // Fetch and display contacts
    const response = await fetch("/api/contacts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch contacts.");
    }

    const contacts = await response.json();
    
    contacts.forEach((contact) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${contact.id}</td>
        <td>${contact.name}</td>
        <td>${contact.phone}</td>
        <td>${contact.email}</td>
        <td><img src="../uploads/${contact.photo}" alt="No Photo" height="50" /></td>
        <td><button class="btn btn-warning btn-sm" onclick="editContact(${contact.id})">Edit</button></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteContact(${contact.id})">Delete</button></td>
      `;

      contactsTableBody.appendChild(row);
    });
  } catch (error) {
    console.error(error);
    alert("Failed to load contacts.");
  }

  // Logout functionality
  document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "login.html"; 
  });
});

// Function to handle contact editing (Optional - to be implemented later)
function editContact(contactId) {
  window.location.href = `update.html?id=${contactId}`;
}














//delete

async function deleteContact(contactId) {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  if (!confirm("Are you sure you want to delete this contact?")) {
    return; // Exit if the user cancels the deletion
  }

  try {
    console.log(`Attempting to delete contact with ID: ${contactId}`);
    const response = await fetch(`/api/contacts/${contactId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error response:", errorData);
      throw new Error(`Failed to delete contact: ${errorData.message}`);
    }

    // Remove the deleted contact's row from the table
    const row = document.querySelector(`tr[data-id='${contactId}']`);
    if (row) {
      row.remove();
    }

    alert("Contact deleted successfully!");
  } catch (error) {
    console.error("Error:", error.message);
    alert("Failed to delete contact.");
  }
}

