import { useState, useEffect } from 'react';
import "../assets/styles/home.css";

return (
    <main className="home-container">
      {showWelcome && (
        <div className="row">
          <div className="col s12">
       
              <div className="card-content">
                <span className="card-title deep-orange-text">Sprout&nbsp;Plan</span>
                <p>Your personal garden planner and simulator.</p>
                </div>
              </div> 
            </div>
          </div>
        </div>
      )}

    </main>
  );
};

export default Home;