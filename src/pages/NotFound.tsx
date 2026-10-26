import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="notfound page">
      <div className="notfound-char" lang="ja">？？</div>
      <p>{t("notFound.nothing")}</p>
      <Link className="btn" to="/">{t("common.backHome")}</Link>
    </div>
  );
}
