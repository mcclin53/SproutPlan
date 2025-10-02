import { useEffect } from 'react'
import './App.css'
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  createHttpLink,
} from '@apollo/client';
import { useEffect } from 'react';
import { setContext } from '@apollo/client/link/context';
import { Outlet, Link } from 'react-router-dom';
import Auth from './utils/auth';

const httpLink = createHttpLink({
  uri: '/graphql',
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

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
});

function App() {
  useEffect(() => {
    const elems = document.querySelectorAll<HTMLElement>('.sidenav');
    M.Sidenav.init(elems, {});
  }, []);

  return (
    <ApolloProvider client={client}>
      <div className="gradient-background min-100-vh">
        <nav>
          <div className="nav-wrapper nav-gradient">
            <div className="container">
              <Link to="/" className="brand-logo">Sprout Plan</Link>
              {/* Desktop-only "My Favorites" button */}
{Auth.loggedIn() && (
  <Link
    to="/favorites"
    className="right hide-on-med-and-down"
    style={{ marginRight: '60px' }}
  >
    My Saved Plots
  </Link>
)}
              <a href="#!" data-target="mobile-demo" className="sidenav-trigger right">
                
                <i className="material-icons">menu</i>
              </a>
            </div>
          </div>
        </nav>

        {/* Sidenav menu */}
        <ul className="sidenav" id="mobile-demo">
          <li><Link to="/">Home</Link></li>
          
          {Auth.loggedIn() ? (
            <>
              <li><a href="/" onClick={() => Auth.logout()}>Logout</a></li>
            </>
          ) : (
            <>
              <li><Link to="/login">Login</Link></li>
              <li><Link to="/signup">Signup</Link></li>
            </>
          )}
        </ul>

        <main className="container">
          <Outlet />
        </main>

       <footer className="page-footer footer-gradient compact-footer">
  <div className="container">
    <div className="row footer-row">
      <div className="col s12">
        <h4 className="left-align" style={{ marginBottom: 0 }}>© 2025 Sprout Plan</h4>
        <p className="grey-text text-lighten-3 left-align">Your personal garden planner</p>
      </div>
    </div>
  </div>
</footer>

        {/* Inline style to always show the burger */}
        <style>
          {`
            .sidenav-trigger {
              display: block !important;
            }
          `}
        </style>
      </div>
    </ApolloProvider>
  );
}

export default App;
