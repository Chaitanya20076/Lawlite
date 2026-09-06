import { Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";

import Contact from "./pages/Contact/Contact";
import Home from "./pages/Home/Home";
import Terms from "./pages/Terms/Terms";
import Privacy from "./pages/Privacy/Privacy";
import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import Onboarding from "./pages/Onboarding/Onboarding";
import Loading from "./pages/Loading/Loading";
import Chat from "./pages/Chat/Chat";

const App = () => {
  const location = useLocation();

  // Full-screen application pages
  const isAppPage =
    location.pathname === "/loading" ||
    location.pathname === "/chat";

  return (
    <>
      {!isAppPage && <Navbar />}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/onboarding" element={<Onboarding />} />

          <Route path="/loading" element={<Loading />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </main>

      {!isAppPage && <Footer />}
    </>
  );
};

export default App;