import "./App.css";
import logo from "./assets/GitHub_Invertocat_White.png";
import stdlibLogo from "./assets/logo.png";
import SVDCompressor from "./Components/SVDCompressor";

export default function App() {
  return (
    <div
      className="min-h-screen text-slate-100 font-sans p-8 flex flex-col items-center"
      style={{
        background:
          "linear-gradient(160deg, #0b0e14 0%, #111a2c 55%, #121824 100%)",
      }}
    >
      <div className="max-w-6xl w-full">
        <header className="mb-6 pb-4 flex items-center justify-between header-container px-5 py-3">
          <div>
            <h1 className="header-heading text-3xl font-bold">ComViz</h1>
          </div>

          <div>
            <a
              href="https://github.com/JavaTypedScript/stdlib-showcase"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
            >
              <img src={logo} alt="GitHub logo" className="logo-image" />
            </a>
          </div>
        </header>

        <main className="panel p-5">
          <SVDCompressor />
        </main>

        <footer className="bottom-0 mt-6 pt-6 ">
          <p className="text-slate-400 text-center flex items-center justify-center gap-2">
            Proudly built using @ <a href="https://stdlib.io/" className=" ">stdlib.js</a><img src={stdlibLogo} alt="stdlib" className="logo-image"/>
          </p>
        </footer>
      </div>
    </div>
  );
}
