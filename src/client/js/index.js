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

  // Looper gennem arrayet for at oprette og tilføje nye listeelementer
  for (let i = 0; i < users.length; i++) {
    // Laver nye listeelementer
    const liItem = document.createElement("li");
    liItem.className = "leaderboardListItem";

    // Opret et span for brugernavnet
    const usernameSpan = document.createElement("span");
    usernameSpan.className = "leaderboardUsername";
    usernameSpan.innerHTML = `#${i + 1}&nbsp;&nbsp;${users[i].username}`;

    // Opret et span for scoren
    const scoreSpan = document.createElement("span");
    scoreSpan.className = "leaderboardScore";
    scoreSpan.innerHTML = `Score: ${users[i].gameScore}`;

    // Føj brugernavnet og scorespændene til listeelementet
    liItem.appendChild(usernameSpan);
    liItem.appendChild(scoreSpan);

    // Føj listeelementet til leaderboard
    leaderboardList.appendChild(liItem);
  }
}
insertUsersInLeaderboard();
