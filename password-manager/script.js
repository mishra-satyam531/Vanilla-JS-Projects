const lockScreen = document.getElementById('lock-screen');
const appContent = document.getElementById('app-content');
const toggleMasterPasswordBtn = document.getElementById('toggleMasterPassword');
const masterPasswordInput = document.getElementById('master-password');
const unlockBtn = document.getElementById('unlock-btn');
const lockError = document.getElementById('lock-error');
let activeMasterPassword = ''; // This will hold the password after unlock
let decryptedPasswords = []; // This will hold the decrypted array

const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".navLinks");
const numberInput = document.getElementById("length");
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordInput = document.getElementById("password");
const lengthForm = document.getElementById("length-form");
const passwordGenerate = document.querySelector(".generate-btn");
const newPassword = document.querySelector(".new-password");
const addPasswordBtn = document.querySelector(".add-password-btn");
const savePasswordBtn = document.querySelector(".savePassword");
const websiteInput = document.getElementById("website");
const usernameInput = document.getElementById("username");
const tableBody = document.getElementById("password-table-body");

function showCopiedFeedback(copyButton) {
  const originalHTML = copyButton.innerHTML;
  copyButton.classList.add("copied");
  copyButton.innerHTML = `<img src="img/checkmark.svg" alt="Copied!">`;
  setTimeout(() => {
    copyButton.classList.remove("copied");
    copyButton.innerHTML = originalHTML;
  }, 1500);
}

function toggleEyeIconVisibility() {
  if (passwordInput.value.length > 0) {
    togglePasswordBtn.classList.remove("hidden");
  } else {
    togglePasswordBtn.classList.add("hidden");
  }
}

function showPasswords() {
  // Clear the current table
  tableBody.innerHTML = "";

  // Loop through the passwords and display them
  decryptedPasswords.forEach((item, index) => {
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
    <span class="password-text" data-password="${item.password}" data-visible="false">
    ${"•".repeat(item.password.length)}
    </span>
    <button class="copy-btn" data-type="password">
      <img src="img/clipboard.svg" alt="copy">
    </button>
    <button class="toggle-visibility-btn">
        <img src="img/eye-open.svg" alt="Show password">
      </button>
    </div>
  </td>
  <td>
    <button class="delete-btn" data-index="${index}">Delete</button>
    <button class="edit-btn" data-index="${index}">Edit</button>
  </td>
`;
    tableBody.appendChild(newRow);
  });
}
showPasswords();

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

lengthForm.addEventListener("submit", (e) => {
  e.preventDefault();
});

numberInput.addEventListener("keydown", (e) => {
  if (e.key == "e" || e.key == "+" || e.key == "-") {
    e.preventDefault();
  }
});

numberInput.addEventListener("input", (e) => {
  const value = parseInt(e.target.value, 10);

  if (value > 20) {
    e.target.value = 20;
  }

  if (value < 1 && e.target.value != "") {
    e.target.value = 1;
  }
});

togglePasswordBtn.addEventListener("click", () => {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  // Change the icon
  const icon = togglePasswordBtn.querySelector("img");
  if (type === "password") {
    icon.src = "img/eye-open.svg";
    icon.alt = "Show password";
  } else {
    icon.src = "img/eye-close.svg";
    icon.alt = "Hide password";
  }
});

const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
const numberChars = "0123456789";
const symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

const allChars = upperCaseChars + lowerCaseChars + numberChars + symbolChars;

passwordGenerate.addEventListener("click", (e) => {
  e.preventDefault();

  let yourPassword = "";
  const passwordLength = numberInput.value;
  const characterSetLength = allChars.length;

  // Create an array to hold secure random numbers
  const randomValues = new Uint32Array(passwordLength);

  // Fill the array with cryptographically secure numbers
  window.crypto.getRandomValues(randomValues);

  // Loop and build the password
  for (let i = 0; i < passwordLength; i++) {
    // Use the secure number to pick a character
    yourPassword += allChars[randomValues[i] % characterSetLength];
  }

  addPasswordBtn.classList.remove("hidden");

  newPassword.innerHTML = `
  <div class="password-to-copy">${yourPassword}</div>
  <button class="copy-password"><img src="img/clipboard.svg" alt="Copy Password"></button>
  `;
});

addPasswordBtn.addEventListener("click", (e) => {
  e.preventDefault();

  const generatedPasswordEl = newPassword.querySelector(".password-to-copy");
  if (generatedPasswordEl) {
    const generatedPassword = generatedPasswordEl.innerText;
    passwordInput.value = generatedPassword;

    toggleEyeIconVisibility();
  }
});

newPassword.addEventListener("click", (e) => {
  const copyButton = e.target.closest(".copy-password");

  const textToCopy = newPassword.querySelector(".password-to-copy").innerText;
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      console.log("Password copied successfully");
      showCopiedFeedback(copyButton);
    })
    .catch((err) => {
      console.log("Failed to copy password");
    });
});

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

  const newPassword = {
    website: website,
    username: username,
    password: password,
  };

  decryptedPasswords.push(newPassword);

  const encryptedData = CryptoJS.AES.encrypt(
    JSON.stringify(decryptedPasswords),
    activeMasterPassword
  ).toString();

  localStorage.setItem("passwords", encryptedData);

  websiteInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";

  showPasswords();
});

// EVENT DELEGATION
tableBody.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const index = e.target.getAttribute("data-index");

    decryptedPasswords.splice(index, 1);

    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(decryptedPasswords),
      activeMasterPassword
    ).toString();

    localStorage.setItem("passwords", encryptedData);

    showPasswords();
  }

  if (e.target.classList.contains("edit-btn")) {
    const allEditButtons = document.querySelectorAll(".edit-btn");
    allEditButtons.forEach((button) => {
      button.disabled = true;
    });

    const index = e.target.getAttribute("data-index");

    const itemToEdit = decryptedPasswords[index];

    const row = e.target.closest("tr");

    row.innerHTML = `
    <td><input type="text" class="edit-input" value="${itemToEdit.website}"></td>
    <td><input type="text" class="edit-input" value="${itemToEdit.username}"></td>
    <td><input type="text" class="edit-input" value="${itemToEdit.password}"></td>
    <td>
      <button class="save-edit-btn" data-index="${index}">Save</button>
      <button class="cancel-edit-btn">Cancel</button>
    </td>
  `;
  }

  if (e.target.classList.contains("save-edit-btn")) {
    const index = e.target.getAttribute("data-index");
    const row = e.target.closest("tr");
    const inputs = row.querySelectorAll(".edit-input");

    decryptedPasswords[index] = {
      website: inputs[0].value,
      username: inputs[1].value,
      password: inputs[2].value,
    };

    const encryptedData = CryptoJS.AES.encrypt(
      JSON.stringify(decryptedPasswords),
      activeMasterPassword
    ).toString();

    localStorage.setItem("passwords", encryptedData);

    showPasswords();
  }

  if (e.target.classList.contains("cancel-edit-btn")) {
    showPasswords();
  }

  if (e.target.closest(".copy-btn")) {
    const copyButton = e.target.closest(".copy-btn");
    let passwords = localStorage.getItem("passwords");
    const row = copyButton.closest("tr");

    const actionButton = row.querySelector(".delete-btn") || row.querySelector(".edit-btn"); 
    const index = actionButton.getAttribute("data-index");

    const dataType = copyButton.getAttribute("data-type");
    
    const textToCopy = decryptedPasswords[index][dataType];

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        console.log("Text copied to clipboard!");

        showCopiedFeedback(copyButton);
      })
      .catch((err) => {
        console.log("Failed to copy text");
      });
  }

const toggleBtn = e.target.closest(".toggle-visibility-btn");
if (toggleBtn) {
  const passwordSpan = toggleBtn.parentElement.querySelector('.password-text');
  const icon = toggleBtn.querySelector('img');
  
  const isVisible = passwordSpan.dataset.visible === 'true';

  if (!isVisible) {
    passwordSpan.innerText = passwordSpan.dataset.password;
    icon.src = "img/eye-close.svg";
    passwordSpan.dataset.visible = 'true'; // Update the state
  } else {
    passwordSpan.innerText = "•".repeat(passwordSpan.dataset.password.length);
    icon.src = "img/eye-open.svg";
    passwordSpan.dataset.visible = 'false'; // Update the state
  }
}
});

toggleMasterPasswordBtn.addEventListener('click', () => {
  const type = masterPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  masterPasswordInput.setAttribute('type', type);

  const icon = toggleMasterPasswordBtn.querySelector('img');
  if (type === 'password') {
    icon.src = 'img/eye-open.svg';
    icon.alt = 'Show password';
  } else {
    icon.src = 'img/eye-close.svg';
    icon.alt = 'Hide password';
  }
});

unlockBtn.addEventListener("click", () => {
  console.log("Unlock button clicked.");
  const passwordAttempt = masterPasswordInput.value;
  const encryptedData = localStorage.getItem("passwords");

  if (!encryptedData) {
    // ---- FIRST TIME USER ----
    activeMasterPassword = passwordAttempt;
    decryptedPasswords = []; 

    lockScreen.classList.add('hidden');
    appContent.classList.remove('hidden');
    showPasswords(); 
  } else {
    // ---- EXISTING USER ----
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, passwordAttempt);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

      if (decryptedData) {
        // ---- SUCCESSFUL LOGIN ----
        activeMasterPassword = passwordAttempt;
        // Check if parsing works
        try {
            decryptedPasswords = JSON.parse(decryptedData);
        } catch (parseError) {
            lockError.innerText = "Data corrupted. Cannot load passwords.";
            lockError.classList.remove('hidden');
            return; // Stop if parsing fails
        }

        lockScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        showPasswords(); 
      } else {
        // ---- FAILED LOGIN (Wrong Password) ----
        throw new Error("Wrong password - decryption yielded empty data");
      }
    } catch (error) {
      // ---- FAILED LOGIN (Error during decryption or thrown error) ----
      lockError.innerText = "Wrong password. Please try again.";
      lockError.classList.remove('hidden');
    }
  }
})