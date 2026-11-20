import { Achievements } from "../../features/achievements/Achievements";
import { Personal } from "../Personal";
import { catalog } from "../catalog";
export default function Page() {
  return (
    <Personal>
      <Achievements catalog={catalog()} />
    </Personal>
  );
}
