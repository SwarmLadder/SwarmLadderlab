import { Shelf } from "../../features/home/Shelf";
import { t } from "../../i18n";
export default function Page() {
  return (
    <div className="shell page-pad">
      <header className="page-head">
        <p className="eyebrow">{t("brand.tagline")}</p>
        <h1 className="display small">{t("home.shelf.title")}</h1>
        <p className="lede">{t("home.shelf.lede")}</p>
      </header>
      <Shelf heading={false} />
    </div>
  );
}
