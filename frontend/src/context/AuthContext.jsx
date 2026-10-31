import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import AuthContext from "./authContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionRevision = useRef(0);

  useEffect(() => {
    let active = true;
    api.get("/auth/me")
      .then((response) => { if (active && sessionRevision.current === 0) setUser(response.data.user); })
      .catch(() => { if (active && sessionRevision.current === 0) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateUser = useCallback((nextUser) => {
    sessionRevision.current += 1;
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    sessionRevision.current += 1;
    try { await api.post("/auth/logout"); }
    finally { setUser(null); }
  }, []);

  const value = useMemo(() => ({ user, loading, setUser: updateUser, logout }), [user, loading, updateUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

