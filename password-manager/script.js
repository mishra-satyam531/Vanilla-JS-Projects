const savePasswordBtn = document.querySelector(".savePassword");
const websiteInput = document.getElementById("website");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const tableBody = document.getElementById("password-table-body");

function showPasswords() {
  // Check if there are passwords in localStorage
  let passwords = localStorage.getItem("passwords");
  if (passwords == null) {
    passwordsArray = [];
  } else {
    passwordsArray = JSON.parse(passwords);
  }

  // Clear the current table
  tableBody.innerHTML = "";

  // Loop through the passwords and display them
  passwordsArray.forEach((item, index) => {
    const newRow = document.createElement("tr");
    newRow.innerHTML = `
        <td>${item.website}</td>
        <td>${item.username}</td>
        <td>${"•".repeat(item.password.length)}</td>
        <td><button class="delete-btn" data-index="${index}">Delete</button></td>
        `;
    tableBody.appendChild(newRow);
  });
}

showPasswords();

savePasswordBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const website = websiteInput.value;
  const username = usernameInput.value;
  const password = passwordInput.value;

  if (website.trim().length === 0) {
    document.querySelector(".webAlert").innerHTML =
      "This field cannot be empty.";
    return; // Stop the function
  }
  if (username.trim().length === 0) {
    document.querySelector(".userAlert").innerHTML =
      "This field cannot be empty.";
    return; // Stop the function
  }
  if (password.trim().length === 0) {
    document.querySelector(".passAlert").innerHTML =
      "This field cannot be empty.";
    return; // Stop the function
  }

  // --- SUCCESS SECTION ---

  // Get existing passwords from localStorage
  let passwordsArray;
  
  let passwords = localStorage.getItem("passwords");
  if (passwords == null) {
    passwordsArray = [];
  } else {
    passwordsArray = JSON.parse(passwords);
  }

  // Create a new password object
  const newPassword = {
    website: website,
    username: username,
    password: password,
  };

  // Add the new password to the array
  passwordsArray.push(newPassword);

  // Save the updated array back to localStorage
  localStorage.setItem("passwords", JSON.stringify(passwordsArray));

  // Clear the input fields
  websiteInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";

  // Update the display
  showPasswords();
});
