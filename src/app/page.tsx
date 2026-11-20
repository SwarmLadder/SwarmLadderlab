import { Home } from "../features/home/Home";
import { Personal } from "./Personal";
import { catalog } from "./catalog";
export default function Page() {
  return (
    <Personal>
      <Home catalog={catalog()} />
    </Personal>
  );
}
