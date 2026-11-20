import { Shelf } from "../../features/home/Shelf";
import { t } from "../../i18n";
export default function Page() {
  return (
    <div className="shell page-pad">
      <header className="page-head">
        <h1 className="display small">{t("home.shelf.title")}</h1>
      </header>
      <Shelf heading={false} />
    </div>
  );
}
