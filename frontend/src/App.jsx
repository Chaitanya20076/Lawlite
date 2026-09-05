import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar/Navbar";
import Footer from "./components/Footer/Footer";
import Contact from "./pages/Contact/Contact";
import Home from "./pages/Home/Home";
import Terms from "./pages/Terms/Terms";
import Privacy from "./pages/Privacy/Privacy";

const App = () => {
  return (
    <>
      <Navbar />

      <main>
        <Routes>

          <Route path="/" element={<Home />} />

          <Route path="/terms" element={<Terms />} />

          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contact" element={<Contact />} />

        </Routes>
      </main>

      <Footer />
    </>
  );
};

export default App;