import { useState, useEffect } from 'react';
import "../assets/styles/home.css";

const Home = () => {
  const [showPlot, setShowPlot] = useState(false);
return (
    <main className="home-container">
      <div className="row">
        <div className="col s12">
          <div className="card-content">
            <span className="card-title deep-orange-text">Sprout&nbsp;Plan</span>
            <p>Your personal garden planner and simulator.</p>
          </div>
        </div> 
      </div>

      {showPlot && (
        <div className= "card">
          <div className="card-content">
              <span className="card-title deep-orange-text">
                Dig a Bed
              </span>
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;