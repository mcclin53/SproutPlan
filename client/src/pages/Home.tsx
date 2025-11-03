import { useState, useEffect } from 'react';
import Garden from "../components/Garden"
import { useQuery } from '@apollo/client';
import { GET_BEDS } from '../utils/queries';
import LocationControls from '../components/LocationControls';

export default function Home () {
  const { data, loading, error } = useQuery(GET_BEDS);

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error: {error.message}</p>;

return (
    <main>
      <div className = "main">
        <p>Your personal garden planner and simulator.</p>
        <LocationControls />
        <Garden />
      </div>
    </main>
  );
}