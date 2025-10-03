import { useState, useEffect } from 'react';
import "../assets/styles/home.css";
import DigBed from "../components/DigBed"
import { useQuery } from '@apollo/client';
import { GET_BEDS } from '../utils/queries';

export default function Home () {
  const { data. loading, error } = useQuery(GET_BEDS);

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>;
}

const Home = () => {

return (
    <main className="home-container">
      <div className="row">
        <div className="col s12">
          <div className="card-content">
            <span className="card-title">Sprout&nbsp;Plan</span>
            <p>Your personal garden planner and simulator.</p>
            <DigBed />
            <ul>
              {data?.beds.map((bed: any) => (
                <li key={bed._id}>
                 {bed.width} × {bed.length}
                </li>
              ))}
            </ul>
          </div>
        </div> 
      </div>
    </main>
  );
};

export default Home;