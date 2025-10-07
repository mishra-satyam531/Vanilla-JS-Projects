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
  <td>
    <div class="cell-content">
    <span>${item.website}</span>
    <button class="copy-btn" data-type="website">
      <img src="img/clipboard.svg" alt="copy">
    </button>
    </div>
  </td>
  <td>
    <div class="cell-content">
    <span>${item.username}</span>
    <button class="copy-btn" data-type="username">
      <img src="img/clipboard.svg" alt="copy">
    </button>
    </div>
  </td>
  <td>
    <div class="cell-content">
    <span>${"•".repeat(item.password.length)}</span>
    <button class="copy-btn" data-type="password">
      <img src="img/clipboard.svg" alt="copy">
    </button>
    </div>
  </td>
  <td>
    <button class="delete-btn" data-index="${index}">Delete</button>
  </td>
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
  document.querySelector(".webAlert").innerHTML = "";
  document.querySelector(".userAlert").innerHTML = "";
  document.querySelector(".passAlert").innerHTML = "";
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

// EVENT DELEGATION
tableBody.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const index = e.target.getAttribute("data-index");

    let passwords = localStorage.getItem("passwords");
    let passwordsArray = JSON.parse(passwords);

    passwordsArray.splice(index, 1);

    localStorage.setItem("passwords", JSON.stringify(passwordsArray));

    showPasswords();
  }

  if (e.target.closest(".copy-btn")) {
    const copyButton = e.target.closest(".copy-btn");
    let passwords = localStorage.getItem("passwords");
    let passwordsArray = JSON.parse(passwords);

    const row = copyButton.closest("tr");
    const deleteButton = row.querySelector(".delete-btn");
    const index = deleteButton.getAttribute("data-index");

    const textToCopy = copyButton.getAttribute("data-type");
    const typeToCopy = passwordsArray[index][textToCopy];

    navigator.clipboard.writeText(typeToCopy).then(() => {
      console.log("Password copied to clipboard!");

      // copyButton.classList.add('copied');
      //       setTimeout(() => {
      //           copyButton.classList.remove('copied');
      //       }, 1500);
    }).catch(err => {
      console.log("Failed to copy text");
    });
  }
});
