import React from "react";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header>
        <div className="wrap">
          <nav>
            <a className="brand" href="/" style={{ color: "inherit" }}>
              <span className="logo">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l2.4 5.2L20 8.6l-4 4 1 6-5-2.9L7 18.6l1-6-4-4 5.6-1.4L12 2z" fill="#fff" />
                </svg>
              </span>
              Adminterview
            </a>
            <div className="navlinks">
              <a href="/employers">Post a role</a>
              <a href="/apply/demo">Candidate demo</a>
              <a href="/practice">Practice</a>
              <a href="/dashboard">Dashboard</a>
            </div>
            <div className="nav-cta">
              <a className="btn btn-primary" href="/employers">Get started</a>
            </div>
          </nav>
        </div>
      </header>
      <main className="wrap" style={{ padding: "40px 24px 80px" }}>
        {children}
      </main>
    </>
  );
}

export function scoreColor(n: number) {
  if (n >= 80) return "#0ca30c";
  if (n >= 60) return "#2a78d6";
  return "#eda100";
}
