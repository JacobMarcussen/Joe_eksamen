function burgerFunction(element) {
  if (window.matchMedia("(max-width: 900px)").matches) {
    element.classList.toggle("change");
  }
}

document.getElementById("closeButton").addEventListener("click", function () {
  document.getElementById("confirmationOverlay").style.display = "none";
});

if (window.location.pathname === "/dashboard") {
  var btn = document.getElementById("gameBtn");
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    console.log("clicked");
    window.location.href = "/game";
  });
}
async function getAllUsers() {
  try {
    const response = await fetch("/leaderboard", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    const data = await response.json();
    return data.users;
  } catch (error) {
    console.error("Fetching error:", error);
  }
}

async function insertUsersInLeaderboard() {
  const users = await getAllUsers();
  const leaderboardList = document.getElementById("leaderboardList");

  leaderboardList.innerHTML = "";

  // Loop through the users array to create and append new list items
  for (let i = 0; i < users.length; i++) {
    // Create a new list item
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.alignItems = "center";
    li.style.padding = "10px 0"; // Add padding or any other styles as needed

    // Create a span for the username
    const usernameSpan = document.createElement("span");
    usernameSpan.className = "leaderboardUsername";
    usernameSpan.innerHTML = `#${i + 1} ${users[i].username}`;

    // Create a span for the score
    const scoreSpan = document.createElement("span");
    scoreSpan.className = "leaderboardScore";
    scoreSpan.innerHTML = `Score: ${users[i].gameScore}`;

    // Append the username and score spans to the list item
    li.appendChild(usernameSpan);
    li.appendChild(scoreSpan);

    // Append the list item to the leaderboard list
    leaderboardList.appendChild(li);
  }
}
insertUsersInLeaderboard();
