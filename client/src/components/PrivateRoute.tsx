import { Navigate } from "react-router-dom";
import Auth from "../utils/auth";

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
    return Auth.loggedIn() ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
