import { initialsOf } from "../domain/avatar";

type AvatarProps = {
  name: string;
  /** From avatarTones; picks one of the --tone-N colours. */
  tone: number | undefined;
  size?: "sm" | "md";
};

/** A colour monogram. Decorative: the name is always shown next to it. */
export function Avatar({ name, tone, size = "md" }: AvatarProps) {
  return (
    <span className={`avatar avatar--${size}`} data-tone={tone ?? 0} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
