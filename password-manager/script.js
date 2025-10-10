function showCopiedFeedback(copyButton) {
  const originalHTML = copyButton.innerHTML;
  copyButton.classList.add('copied');
  copyButton.innerHTML = `<img src="img/checkmark.svg" alt="Copied!">`;
  setTimeout(() => {
    copyButton.classList.remove('copied');
    copyButton.innerHTML = originalHTML;
  }, 1500);
}

const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".navLinks");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

const numberInput = document.getElementById("length");
numberInput.addEventListener("keydown", (e) => {
  if(e.key == 'e' || e.key == '+' || e.key == '-') {
    e.preventDefault();
  }
})

numberInput.addEventListener("input", (e) => {
  const value = parseInt(e.target.value, 10);

  if(value > 20) {
    e.target.value = 20;
  }

  if(value < 1 && e.target.value != "") {
    e.target.value = 1;
  }
})
// Add this to your script.js
const togglePasswordBtn = document.getElementById('togglePassword');
// The 'passwordInput' variable is already defined in your code

togglePasswordBtn.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);

  // Change the icon
  const icon = togglePasswordBtn.querySelector('img');
  if (type === 'password') {
    icon.src = 'img/eye-open.svg';
    icon.alt = 'Show password';
  } else {
    icon.src = 'img/eye-close.svg';
    icon.alt = 'Hide password';
  }
});

const lengthForm = document.getElementById("length-form");
lengthForm.addEventListener("submit", (e) => {
  e.preventDefault();
})

const upperCaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lowerCaseChars = "abcdefghijklmnopqrstuvwxyz";
const numberChars = "0123456789";
const symbolChars = "!@#$%^&*()_+-=[]{}|;:,.<>?";

const allChars = upperCaseChars + lowerCaseChars + numberChars + symbolChars;

const passwordGenerate = document.querySelector(".generate-btn");
const newPassword = document.querySelector(".new-password");
passwordGenerate.addEventListener("click", (e) => {
  e.preventDefault();

  let yourPassword = "";
  for (let i = 0; i < numberInput.value; i++) {
    yourPassword += allChars[Math.floor((Math.random() * 88))];
  }
  console.log(yourPassword);

  newPassword.innerHTML = `
  <div class="password-to-copy">${yourPassword}</div>
  <button class="copy-password"><img src="img/clipboard.svg" alt="Copy Password"></button>
  `;
})

newPassword.addEventListener("click", (e) => {
  e.preventDefault();
  const copyButton = e.target.closest(".copy-password");

  const textToCopy = newPassword.querySelector(".password-to-copy").innerText;
  navigator.clipboard.writeText(textToCopy).then(() => {
    console.log("Password copied successfully");
    showCopiedFeedback(copyButton);
  }).catch(err => {
    console.log("Failed to copy password");
  })
})

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
    <span class="password-text" data-password="${item.password}">
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
  
  let passwordsArray;

  let passwords = localStorage.getItem("passwords");
  if (passwords == null) {
    passwordsArray = [];
  } else {
    passwordsArray = JSON.parse(passwords);
  }

  const newPassword = {
    website: website,
    username: username,
    password: password,
  };

  passwordsArray.push(newPassword);

  localStorage.setItem("passwords", JSON.stringify(passwordsArray));

  websiteInput.value = "";
  usernameInput.value = "";
  passwordInput.value = "";

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

      // to indicate text is copied
      showCopiedFeedback(copyButton); 
    }).catch(err => {
      console.log("Failed to copy text");
    });
  }

  const toggleBtn = e.target.closest(".toggle-visibility-btn");
if (toggleBtn) {
  const passwordSpan = toggleBtn.parentElement.querySelector('.password-text');
  const icon = toggleBtn.querySelector('img');
  
  if (passwordSpan.innerText.includes("•")) {
    passwordSpan.innerText = passwordSpan.dataset.password;
    icon.src = 'img/eye-close.svg';
    icon.alt = 'Hide password';
  } else {
    passwordSpan.innerText = "•".repeat(passwordSpan.dataset.password.length);
    icon.src = 'img/eye-open.svg';
    icon.alt = 'Show password';
  }
}
});
