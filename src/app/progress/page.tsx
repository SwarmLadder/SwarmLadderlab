import { Progress } from "../../features/progress/Progress";
import { Personal } from "../Personal";
import { catalog } from "../catalog";
export default function Page() {
  return (
    <Personal>
      <Progress catalog={catalog("python")} sqlCatalog={catalog("sql")} />
    </Personal>
  );
}
