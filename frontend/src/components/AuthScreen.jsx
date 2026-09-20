import { useState } from "react";
import LoginForm from "./LoginForm.jsx";
import SignupForm from "./SignupForm.jsx";

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");

  if (mode === "signup") {
    return (
      <SignupForm
        onAuthenticated={onAuthenticated}
        onSwitchToLogin={() => setMode("login")}
      />
    );
  }

  return (
    <LoginForm
      onAuthenticated={onAuthenticated}
      onSwitchToSignup={() => setMode("signup")}
    />
  );
}

export default AuthScreen;
