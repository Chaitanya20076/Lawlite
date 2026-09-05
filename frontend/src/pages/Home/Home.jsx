import Hero from "./Hero/Hero";
import HowItWorks from "./HowItWorks/HowItWorks";
import Features from "./Features/Features";
import WhyLawlite from "./WhyLawlite/WhyLawlite";
import CTA from "./CTA/CTA";

import "./Home.css";

const Home = () => {
  return (
    <div className="home">
      <Hero />
      <HowItWorks />
      <Features />
      <WhyLawlite />
      <CTA />
    </div>
  );
};

export default Home;