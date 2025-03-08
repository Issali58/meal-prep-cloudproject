// Amazon Cognito configuration
const AmazonCognitoConfig = {
  UserPoolId: "your-user-pool-id",
  ClientId: "your-client-id",
};

// Initialize the Amazon Cognito authentication object
const userPool = new AmazonCognito.CognitoUserPool({
  UserPoolId: AmazonCognitoConfig.UserPoolId,
  ClientId: AmazonCognitoConfig.ClientId,
});

// DOM Elements
const authButton = document.getElementById("authButton");
const authButtonText = authButton.querySelector("span");

// Check authentication status
function checkAuth() {
  const cognitoUser = userPool.getCurrentUser();

  if (cognitoUser != null) {
    cognitoUser.getSession((err, session) => {
      if (err) {
        console.error("Error getting session:", err);
        updateUIForGuest();
        return;
      }

      if (session.isValid()) {
        updateUIForUser(cognitoUser);
      } else {
        updateUIForGuest();
      }
    });
  } else {
    updateUIForGuest();
  }
}

// Update UI for signed-in user
function updateUIForUser(cognitoUser) {
  cognitoUser.getUserAttributes((err, attributes) => {
    if (err) {
      console.error("Error getting user attributes:", err);
      return;
    }

    // Find email from attributes
    const email = attributes.find((attr) => attr.Name === "email")?.Value;

    // Update button text and click handler
    authButtonText.textContent = email || "Account";
    authButton.onclick = handleSignOut;
  });
}

// Update UI for guest user
function updateUIForGuest() {
  authButtonText.textContent = "Sign In";
  authButton.onclick = () => (window.location.href = "/login.html");
}

// Handle sign out
function handleSignOut() {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
    window.location.reload();
  }
}

// Check auth status when page loads
document.addEventListener("DOMContentLoaded", checkAuth);
