import { type JwtPayload, jwtDecode } from 'jwt-decode';

// provides an authentication service for a client-side application, allowing users to manage their authentication state, including login, logout, and token validation.
interface ExtendedJwt extends JwtPayload {
  data:{
    username:string,
    email:string,
    _id:string
  }
}

// defines an authentication service that handles user authentication, including checking if a user is logged in, retrieving user profile information, and managing JWT tokens.
class AuthService {
  getProfile() {
    return jwtDecode<ExtendedJwt>(this.getToken());
  }

  loggedIn() {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  isTokenExpired(token: string) {
    try {
      const decoded = jwtDecode<JwtPayload>(token);

      if (decoded?.exp && decoded?.exp < Date.now() / 1000) {
        return true;
      }
    } catch (err) {
      return false;
    }
  }

  // retrieves the JWT token from local storage, which is used to authenticate the user.
  getToken(): string {
    const loggedUser = localStorage.getItem('id_token') || '';
    return loggedUser;
  }

  login(idToken: string) {
    localStorage.setItem('id_token', idToken);
    window.location.assign('/');
  }

  logout() {
    localStorage.removeItem('id_token');
    window.location.assign('/');
  }
}

export default new AuthService();
