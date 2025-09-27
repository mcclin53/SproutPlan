import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { REGISTER } from '../utils/mutations';
import Auth from '../utils/auth';

// Signup component for user registration
const Signup = () => {
  const [formState, setFormState] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [register, { error, data }] = useMutation(REGISTER);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormState({
      ...formState,
      [name]: value,
    });
  };

  // Function to handle form submission
  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      const { data } = await register({
        variables: { 
          input: { 
            ...formState 
          } 
        },
      });

      Auth.login(data.register.token);
    } catch (e) {
      console.error(e);
    }
  };

  // Render the signup form
  return (
    <main className="signup-container">
    <div className="row signup-row">
      <div className="col-12">
        <div className="card">
          <div className="card-content">
            <span className="card-title deep-orange-text">Sign Up</span>
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
