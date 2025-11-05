import './index.css'
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import App from './App';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/SignUp';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,

    children: [
      {
        index: true,
        element: (
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        )
      },
      {
        path: '/login',
        element: <Login />
      }, 
      {
        path: '/signup',
        element: <Signup />
      },
    ]
  },
]);

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<RouterProvider router={router} />);
}
