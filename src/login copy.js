// Import your initialized Firebase app & auth
import { auth } from "./main.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";

const loginBtn = document.getElementById("loginBtn");

onAuthStateChanged(auth, (user) => {
  if (user) {
    // User already logged in
    window.location.href = "/dashboard";
  }
});

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    // Sign in admin
    await signInWithEmailAndPassword(auth, email, password);
    // Redirect to dashboard
    window.location.href = "dashboard";
  } catch (error) {
    alert("Login failed: " + error.message);
  }
});
