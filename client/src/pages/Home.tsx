import Garden from "../components/Garden"
import { useQuery } from '@apollo/client';
import { GET_BEDS, QUERY_ME } from '../utils/queries';
import LocationControls from '../components/LocationControls';
import { AdminPlantForm } from '../components/AdminPlantForm';

export default function Home () {

  const { data: bedsData, loading: bedsLoading, error: bedsError } = useQuery(GET_BEDS);
  const { data: meData, loading: meLoading } = useQuery(QUERY_ME);

  if (bedsLoading || meLoading) return <p>Loading...</p>;
  if (bedsError) return <p>Error: {bedsError.message}</p>;

  const me = meData?.me;
  const isAdmin = me?.role === "admin";

return (
    <main>
      <div className = "main">
        <p>Your personal garden planner and simulator.</p>
        <LocationControls />

        {isAdmin && (
          <section style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #ccc" }}>
            <h2>Admin: Manage Plants</h2>
            <AdminPlantForm />
          </section>
        )}

        <Garden />
      </div>
    </main>
  );
}