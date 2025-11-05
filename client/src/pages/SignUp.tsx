import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApolloError, useMutation, useApolloClient } from '@apollo/client';
import { REGISTER, SET_USER_LOCATION } from '../utils/mutations';
import Auth from '../utils/auth';

// Signup component for user registration
const Signup = () => {
  const navigate = useNavigate(); 
  const [formState, setFormState] = useState({ username: '', email: '', password: '' });

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  const [register, { error, data }] = useMutation(REGISTER);
  const [setUserLocation] = useMutation(SET_USER_LOCATION, {
    errorPolicy: 'all',
    onError: (e: ApolloError) => {
      console.error("setUserLocation error:", {
        graphQLErrors: e.graphQLErrors,
        networkError: e.networkError,
        message: e.message,
      });
    },
  });
  const client =  useApolloClient();
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState({ ...formState, [name]: value });
  };

  async function handleEnableLocation() {
    setLocError(null);
    setLocLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });

      console.log("📍 Got location from browser:", position.coords.latitude, position.coords.longitude);

    } catch (e: any) {
      setCoords(null);
      setLocError(e?.message || 'Unable to get your location. You can still sign up without it.');

      console.warn("⚠️ Geolocation failed:", e);

    } finally {
      setLocLoading(false);
    }
  }

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const input: any = {
      username: formState.username,
      email: formState.email,
      password: formState.password,
    };
    if (coords) {
      input.homeLat = coords.lat;
      input.homeLon = coords.lon;
    }

    console.log("🧩 Submitting signup with input:", input);
    
    try {
      const { data } = await register({ variables: { input } });
      console.log("✅ REGISTER response:", data);
      Auth.login(data.register.token, { redirect: false });
      console.log("🔑 Token stored, resetting Apollo cache...");
      await client.resetStore();

      if (coords) {
        try {
          console.log("🌍 Calling setUserLocation with:", { lat: coords.lat, lon: coords.lon });
          const locRes = await setUserLocation({
            variables: { lat: coords.lat, lon: coords.lon },
          });
          console.log("📦 setUserLocation response:", locRes?.data?.setUserLocation);
        } catch (e) {
          console.error("❌ setUserLocation threw:", e);
        }
      }

      await new Promise((r) => setTimeout(r, 300));

      navigate("/");
    } catch (e) {
      console.error("❌ Signup error:", e);
    }
  };

  return (
    <main className="signup-container">
    <div className="row signup-row">
      <div className="col-12">
        <div className="card">
          <div className="card-content">
            <span className="card-title">Sign Up</span>

            {data ? (
              <p>
                Success! You may now proceed to{' '}
                <Link to="/">the homepage.</Link>
              </p>
            ) : (
              <form onSubmit={handleFormSubmit}>
                <div className="input-field">
                  <input
                    className="validate"
                    placeholder="Your username"
                    name="username"
                    type="text"
                    value={formState.username}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="username" className="active">Username</label>
                </div>

                <div className="input-field">
                  <input
                    className="validate"
                    placeholder="Your email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="email" className="active">Email</label>
                </div>

                <div className="input-field">
                  <input
                    className="validate"
                    placeholder="******"
                    name="password"
                    type="password"
                    value={formState.password}
                    onChange={handleChange}
                    required
                  />
                  <label htmlFor="password" className="active">Password</label>
                </div>

                <div style={{ margin: '12px 0' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleEnableLocation}
                    disabled={locLoading}
                  >
                    {locLoading ? 'Detecting location…' : 'Enable Location (Optional)'}
                  </button>
                  {coords && (
                    <p style={{ marginTop: 8 }}>
                      Location set ✓ ({coords.lat.toFixed(4)}, {coords.lon.toFixed(4)})
                    </p>
                  )}
                  {locError && (
                    <p style={{ marginTop: 8, color: 'red' }}>
                      {locError}
                    </p>
                  )}
                </div>

                <button
                  className="btn"
                  type="submit"
                >
                  Submit
                </button>
              </form>
            )}

            {error && (
              <div className="card-panel">
                {error.message}
              </div>
            )}
          </div>
          <div className="card-action">
            <p>
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </main>
  );
};

export default Signup;
