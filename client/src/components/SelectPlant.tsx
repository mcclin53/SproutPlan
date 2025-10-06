// import React from "react";

// interface PlantSelectorProps {
//   selectedPlants: string[];
//   onChange: (plants: string[]) => void;
// }

// const PLANTS = ["Tomato", "Carrot", "Lettuce", "Pepper", "Cucumber"];

// export default function PlantSelector({ selectedPlants, onChange }: PlantSelectorProps) {
//   const togglePlant = (plant: string) => {
//     if (selectedPlants.includes(plant)) {
//       onChange(selectedPlants.filter((p) => p !== plant));
//     } else {
//       onChange([...selectedPlants, plant]);
//     }
//   };

//   return (
//     <div>
//       <h3>Select Plants</h3>
//       <ul>
//         {PLANTS.map((plant) => (
//           <li key={plant}>
//             <label>
//               <input
//                 type="checkbox"
//                 checked={selectedPlants.includes(plant)}
//                 onChange={() => togglePlant(plant)}
//               />
//               {plant}
//             </label>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }