export default function MorisWordmark({ className = "", ariaLabel = "MORIS" }) {
  const classes = ["moris-wordmark", className].filter(Boolean).join(" ");

  return (
    <img
      className={classes}
      src="/moris-wordmark.png"
      alt={ariaLabel}
      decoding="async"
      draggable="false"
    />
  );
}
