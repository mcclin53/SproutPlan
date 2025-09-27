import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { LOGIN_USER } from '../utils/mutations';
import Auth from '../utils/auth';

// Login component for user authentication
const Login = () => {
  const [formState, setFormState] = useState({ email: '', password: '' });
  const [login, { error, data }] = useMutation(LOGIN_USER);

  // update state based on form input changes
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormState({
      ...formState,
      [name]: value,
    });
  };

  // submit form
  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      const { data } = await login({
        variables: { ...formState },
      });

      Auth.login(data.login.token);
    } catch (e) {
      console.error(e);
    }

    // clear form values
    setFormState({
      email: '',
      password: '',
    });
  };

  // if user is logged in, redirect to home page
  return (
    <main className="login-container">
    <div className="row login-row">
      <div className="col-12">
        <div className="card login-card">
          <div className="card-content">
            <span className="card-title deep-orange-text">Login</span>
            {data ? (
              <p>
                Success! You are now logged in.{' '}
                <Link to="/">Go to Home</Link>
              </p>
            ) : (
              <form onSubmit={handleFormSubmit}>
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
                <button
                  className="btn waves-effect waves-light deep-orange"
                  type="submit"
                >
                  Submit
                </button>
              </form>
            )}

            {error && (
              <div className="card-panel red lighten-4 red-text text-darken-4 my-3">
                {error.message}
              </div>
            )}
          </div>
          <div className="card-action">
            <p>
              Don't have an account? <Link to="/signup">Signup</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
    </main>
  );
};

export default Login;
