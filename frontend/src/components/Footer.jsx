export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-left">
        <img
          src="/tic-tac-toe.svg"
          alt="Tic-tac-toe logo"
          className="site-footer-logo"
        />
        <span>Tic-tac-toe by Kritik</span>
      </div>
      <a
        className="site-footer-button"
        href="https://github.com/smilekritik/tic-tac-toe"
        target="_blank"
        rel="noreferrer"
      >
        <span className="site-footer-button-icon" />
        <span>GitHub</span>
      </a>
    </footer>
  );
}

