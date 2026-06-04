import MasterNeuralGraph from "../components/MasterNeuralGraph";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Master Neural Map | Um Mohammad",
  description: "An ultra-detailed data visualization and interactive neural network graph connecting projects, education, certificates, and socials.",
};

export default function NeuralGraphPage() {
  return (
    <main style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#121212" }}>
      <MasterNeuralGraph />
    </main>
  );
}
