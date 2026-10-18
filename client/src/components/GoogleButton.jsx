import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function GoogleButton({ onError }) {
  const ref = useRef(null);
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    const render = () => {
      if (cancelled || !ref.current || !window.google?.accounts?.id) return;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) { if (onError) onError("Add VITE_GOOGLE_CLIENT_ID to client/.env to enable Google sign-in."); return; }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try { await googleLogin(response.credential); navigate("/dashboard"); }
          catch (err) { onError?.(err.response?.data?.message || "Google sign-in failed."); }
        }
      });
      ref.current.innerHTML = "";
      window.google.accounts.id.renderButton(ref.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width: 320 });
    };
    const timer = setInterval(() => { if (window.google?.accounts?.id) { clearInterval(timer); render(); } }, 250);
    return () => { cancelled = true; clearInterval(timer); };
  }, [googleLogin, navigate, onError]);
  return <div className="google-wrap"><div ref={ref} /><p className="muted tiny">Google sign-in requires a configured OAuth Web Client ID.</p></div>;
}
