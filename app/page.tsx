import { HeroPoints } from "../components/HeroPoints";
import MonetizationSlide from "../components/MonetizationSlide";
import { Button } from "../components/Button";

export default function HomePage() {
  return (
    <div>
      <h1>Adminterview</h1>
      <p>Welcome to the platform.</p>
      <HeroPoints />
      <MonetizationSlide />
      <Button>Get started</Button>
    </div>
  );
}
