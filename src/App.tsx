import { useEffect, useState } from "react";
import { DesktopPage } from "./features/desktop/DesktopPage";
import { ShowcasePage } from "./features/showcase/ShowcasePage";

export default function App() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    if (window.location.pathname === "/") {
      window.history.replaceState(null, "", "/desktop");
      setPath("/desktop");
    }
  }, []);

  if (path === "/desktop") {
    return <DesktopPage />;
  }

  if (path === "/showcase") {
    return <ShowcasePage />;
  }

  return <ShowcaseNotFound />;
}

function ShowcaseNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#06111f] px-6 text-white">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Cober page not found</h1>
        <a
          className="mt-5 inline-flex rounded-full border border-sky-300/40 bg-sky-300/10 px-5 py-2 text-sm text-sky-100 transition hover:bg-sky-300/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          href="/desktop"
        >
          Open /desktop
        </a>
      </div>
    </main>
  );
}
