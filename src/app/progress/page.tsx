import { Progress } from "../../features/progress/Progress";
import { Personal } from "../Personal";
import { catalog } from "../catalog";

export default function Page() {
  return (
    <Personal>
      <Progress catalogs={[
        { id: "python", catalog: catalog("python") },
        { id: "sql", catalog: catalog("sql") },
        { id: "git", catalog: catalog("git") },
        { id: "rust", catalog: catalog("rust") },
      ]} />
    </Personal>
  );
}
