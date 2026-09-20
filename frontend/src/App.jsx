import { useEffect, useState } from "react";
import "./App.css";
import { getCurrentUser } from "./api/auth.js";
import {
  clearStoredToken,
  getStoredToken,
  storeToken,
} from "./api/client.js";
import AppHeader from "./components/AppHeader.jsx";
import AuthScreen from "./components/AuthScreen.jsx";
import DocumentWorkspace from "./components/DocumentWorkspace.jsx";

function App() {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(!getStoredToken());

  const handleLogout = () => {
    clearStoredToken();
    setToken("");
    setUser(null);
    setAuthReady(true);
  };

  const handleAuthenticated = (nextToken, nextUser) => {
    storeToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
    setAuthReady(true);
  };

  useEffect(() => {
    const restoreSession = async () => {
      if (!token) {
        setAuthReady(true);
        return;
      }

      try {
        const data = await getCurrentUser(token);
        setUser(data.user);
      } catch {
        handleLogout();
      } finally {
        setAuthReady(true);
      }
    };

    restoreSession();
  }, []);

  return (
    <div className="min-h-screen bg-[#050d1f] bg-grid text-slate-200 font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-violet-600/8 blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        <AppHeader user={user} onLogout={handleLogout} />

        {!authReady ? (
          <div className="card-glass rounded-2xl p-6 text-center text-slate-400">
            Checking session…
          </div>
        ) : !token ? (
          <AuthScreen onAuthenticated={handleAuthenticated} />
        ) : (
          <DocumentWorkspace token={token} onAuthError={handleLogout} />
        )}

        <p className="text-center text-slate-600 text-xs mt-10">
          Powered by RAG · Vector Embeddings · LLM
        </p>
      </div>
    </div>
  );
}

export default App;
