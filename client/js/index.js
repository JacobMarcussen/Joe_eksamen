function myFunction(x) {
  x.classList.toggle("change");
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
  const leaderboardRow = document.getElementsByClassName("række");
  const leaderboardUsername = document.getElementsByClassName("brugernavn");
  const leaderboardScore = document.getElementsByClassName("score");

  for (let i = 0; i < leaderboardRow.length; i++) {
    leaderboardRow[i].style.display = "none";
  }

  for (let i = 0; i < users.length; i++) {
    leaderboardRow[i].style.display = "flex";
    leaderboardUsername[i].innerHTML = `#${i + 1} ` + users[i].username;
    leaderboardScore[i].innerHTML = `Score: ` + users[i].gameScore;
  }
}
insertUsersInLeaderboard();
