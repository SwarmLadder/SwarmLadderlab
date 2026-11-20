import { Curriculum } from "../../features/curriculum/Curriculum";
import { Personal } from "../Personal";
import { catalog } from "../catalog";
export default function Page() {
  return (
    <Personal>
      <Curriculum catalog={catalog()} />
    </Personal>
  );
}
