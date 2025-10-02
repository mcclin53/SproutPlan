import SaveFavorites from "../components/saveFavorites";

function Favorites() {
  return (
      <main className="home-container">
        <div className="section">
          <div className="row">
            <div className="col s12">
              <div className="card">
                <div className="card-content">
                  <h1 className="card-title deep-orange-text">   <SaveFavorites /></h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
  );
}

export default Favorites;