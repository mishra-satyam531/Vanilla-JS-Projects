const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector("ul");

hamburger.addEventListener("click", () => {
  navLinks.classList.toggle("active");
});

let submit = document.querySelector("#main-btn");
// 1. Make the event listener function async
submit.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("submit");

    resultCont.innerHTML = `<img src="img/loading.svg" alt="Loading...">`;

    let key = "YOUR_API_KEY_HERE";
    let email = document.querySelector("input").value;
    let url = `https://api.emailvalidation.io/v1/info?apikey=${key}&email=${email}`;

    // 2. Start a try...catch block to handle potential errors
    try {
        // 3. Fetch data from the API and wait for the response
        const response = await fetch(url);
        // Convert the response into a JSON object and wait for it
        const data = await response.json();

        let str = ``;
        for (key of Object.keys(data)) {
            str += `<div>${key}: ${data[key]}</div>`;
        }
        
        const result = document.querySelector(".response");
        result.classList.remove("hidden");
        const resultCont = document.getElementById("resultCont");
        resultCont.innerHTML = str;
    } catch (error) {
        resultCont.innerHTML = `<div>Error: Could not validate email.</div>`;
    }
});