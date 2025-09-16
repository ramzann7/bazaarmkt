// src/components/Login.jsx
import { useState } from "react";
import { loginUser, logoutUser, getProfile } from "../services/authservice";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      const data = await loginUser(form);
      setMessage(`Login successful! Welcome ${data.user.name}`);
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed");
    }
  };

  const handleGetProfile = async () => {
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to fetch profile");
    }
  };

  const handleLogout = () => {
    logoutUser();
    setProfile(null);
    setMessage("Logged out");
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Login</button>
      </form>
      <button onClick={handleGetProfile}>Get Profile</button>
      <button onClick={handleLogout}>Logout</button>
      {message && <p>{message}</p>}
      {profile && (
        <div>
          <h3>Profile:</h3>
          <pre>{JSON.stringify(profile, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
