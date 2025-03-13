AWS.config.region = "us-east-1";
import config from "../js/config.js";
const poolData = {
  UserPoolIsd: config.USERPOOLID, // Replace with your User Pool ID
  ClientId: config.COGNITO_CLIENT_ID, // Replace with your App Client ID
};

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

document.addEventListener("DOMContentLoaded", function () {
  // Handle Login Form Submit
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const authenticationData = {
      Username: email,
      Password: password,
    };

    const authenticationDetails =
      new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    const userData = {
      Username: email,
      Pool: userPool,
    };

    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
        console.log("Login successful!");

        // Get the tokens
        const accessToken = result.getAccessToken().getJwtToken();
        const idToken = result.getIdToken().getJwtToken();

        // Store tokens
        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("idToken", idToken);

        // Show success message
        const successMessage = document.createElement("div");
        successMessage.className = "success-message";
        successMessage.textContent = "Login successful! Redirecting...";
        document.getElementById("loginForm").appendChild(successMessage);

        // Redirect
        setTimeout(() => {
          window.location.href = "index3.html";
        }, 1000);
      },

      onFailure: function (err) {
        console.error("Login failed:", err);
        const errorDiv = document.getElementById("loginError");
        errorDiv.textContent = err.message || "An error occurred during login";
        errorDiv.style.display = "block";
      },
    });
  });

  // Handle Sign Up Form Submit
  document
    .getElementById("signupForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      const email = document.getElementById("signupEmail").value;
      const password = document.getElementById("signupPassword").value;

      const attributeList = [
        new AmazonCognitoIdentity.CognitoUserAttribute({
          Name: "email",
          Value: email,
        }),
      ];

      userPool.signUp(
        email,
        password,
        attributeList,
        null,
        function (err, result) {
          if (err) {
            console.error("Sign up failed:", err);
            const errorDiv = document.getElementById("signupError");
            errorDiv.textContent =
              err.message || "An error occurred during sign up";
            errorDiv.style.display = "block";
            return;
          }

          console.log("Sign up successful!");
          const successMessage = document.createElement("div");
          successMessage.className = "success-message";
          successMessage.textContent =
            "Sign up successful! Please check your email for verification.";
          document.getElementById("signupForm").appendChild(successMessage);
        }
      );
    });

  // Toggle between login and signup forms
  document
    .getElementById("toggleSignup")
    .addEventListener("click", function () {
      const loginForm = document.getElementById("loginForm");
      const signupForm = document.getElementById("signupForm");
      const toggleButton = document.getElementById("toggleSignup");

      if (loginForm.classList.contains("active")) {
        loginForm.classList.remove("active");
        loginForm.classList.add("hidden");
        signupForm.classList.remove("hidden");
        signupForm.classList.add("active");
        toggleButton.textContent = "Back to Login";
      } else {
        signupForm.classList.remove("active");
        signupForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        loginForm.classList.add("active");
        toggleButton.textContent = "Sign up";
      }
    });
});
