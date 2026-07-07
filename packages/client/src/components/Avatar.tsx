import { avatarColor, initials } from "../lib/format";

export default function Avatar({
  name,
  seed,
  size = 40,
  online,
  url,
}: {
  name: string;
  seed?: string;
  url?: string | null;
  size?: number;
  online?: boolean;
}) {
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        background: url ? `url(${url.startsWith('http') ? url : `http://localhost:4000${url}`}) center/cover` : avatarColor(seed ?? name),
        fontSize: size * 0.4,
      }}
    >
      {!url && initials(name)}
      {online && <span className="dot" />}
    </div>
  );
}
