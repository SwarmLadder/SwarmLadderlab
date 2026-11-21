import { Home } from "../features/home/Home";
import { Personal } from "./Personal";
import { catalog } from "./catalog";

export default function Page() {
  return (
    <Personal>
      <Home
        catalog={catalog("python")}
        sqlCatalog={catalog("sql")}
        gitCatalog={catalog("git")}
        rustCatalog={catalog("rust")}
        linuxCatalog={catalog("linux")}
        dsaCatalog={catalog("dsa")}
        cCatalog={catalog("c")}
      />
    </Personal>
  );
}
