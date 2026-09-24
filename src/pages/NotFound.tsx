import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="notfound page">
      <div className="notfound-char" lang="ja">？？</div>
      <p>Nothing here.</p>
      <Link className="btn" to="/">Back home</Link>
    </div>
  );
}
