import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="page">
      <h1>Tic-Tac-Toe</h1>
      <p>Play classic tic-tac-toe online with friends.</p>
      <div className="links">
        <Link to="/auth/login">Login</Link>
        <Link to="/auth/register">Register</Link>
      </div>
    </div>
  );
}
