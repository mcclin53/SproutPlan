import './App.css';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { Outlet, Link } from 'react-router-dom';
import Auth from './utils/auth';
import { useState } from 'react';

const httpLink = createHttpLink({
  uri: import.meta.env.VITE_GRAPHQL_URI || 'http://localhost:3001/graphql',
});

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('id_token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

import { ApolloLink } from "@apollo/client";
const debugLink = new ApolloLink((op, fwd) => {
  console.log("op", op.operationName, op.variables, op.getContext().headers);
  return fwd!(op);
});

const cache = new InMemoryCache({
  typePolicies: {
    Profile: {
      keyFields: ["_id"],
    },
    Bed: {
      keyFields: ["_id"],
      fields: {
        plantInstances: {
          merge(existing = [], incoming: any[]) {
            const merged = [...existing];
            incoming.forEach(incomingPlant => {
              if (!existing.some((p: any) => p._id === incomingPlant._id)) {
                merged.push(incomingPlant);
              }
            });
            return merged;
          },
        },
      },
    },
  },
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache,
});

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleMobileMenu = () => setMobileOpen(!mobileOpen);
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <ApolloProvider client={client}>
      <div className="translucent-box">
        <nav className="nav-gradient">
          <div className="container nav-container">
            <Link to="/" className="brand-logo">
              Sprout Plan
            </Link>

            {/* Desktop-only dropdown */}
            {Auth.loggedIn() && (
              <div className="dropdown">
                <button
                  className="dropdown-button"
                  onClick={toggleMobileMenu}
                >
                ☰
                </button>
                <ul className={`dropdown-menu ${mobileOpen ? 'show' : ''}`}>
                  <li>
                    <Link
                      to="/favorites"
                      onClick={() => setMobileOpen(false)}
                    >
                      My Saved Plots
                    </Link>
                  </li>
                  <li>
                    <a
                      href="/"
                      onClick={() => {
                        Auth.logout();
                        setMobileOpen(false);
                      }}
                    >
                      Logout
                    </a>
                  </li>
                  {/* Future menu items can go here */}
                </ul>
              </div>
            )}
          </div>
        </nav>

        <main className="container">
          <Outlet />
        </main>

        <footer className="footer-gradient compact-footer">
          <div className="container">
            <div className="footer-row">
              <h4>© 2025 Sprout Plan</h4>
              <p className="grey-text">Your personal garden planner</p>
            </div>
          </div>
        </footer>
      </div>
    </ApolloProvider>
  );
}

export default App;