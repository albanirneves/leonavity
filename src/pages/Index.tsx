
import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to dashboard for authenticated users
  // This will be handled by the auth system and protected routes
  return <Navigate to="/dashboard" replace />;
};

export default Index;
